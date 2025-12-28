/* eslint-disable @typescript-eslint/no-require-imports */
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '@/app/api/patients/[id]/route';
import Patient from '@/models/Patient';

// Mock setup
const mockExec = jest.fn();
const mockChain: any = {
  populate: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: mockExec,
};
mockChain.then = (resolve: any, reject: any) =>
  mockExec().then(resolve, reject);

jest.mock('next/server', () => {
  return {
    NextRequest: class {
      url: string;
      method: string;
      body: any;
      constructor(url: string, init?: any) {
        this.url = url;
        this.method = init?.method || 'GET';
        this.body = init?.body;
      }
      async json() {
        return this.body ? JSON.parse(this.body) : {};
      }
    },
    NextResponse: {
      json: (data: any, init?: { status?: number }) => ({
        json: async () => data,
        status: init?.status || 200,
      }),
    },
  };
});

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn().mockResolvedValue({
    user: { id: '1', email: 'jebarsanthatcroos@gmail.com' },
  }),
}));

jest.mock('@/models/Patient', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock('@/lib/mongodb', () => ({
  connectDB: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockExec.mockResolvedValue(null);

  (Patient.findById as jest.Mock).mockReturnValue(mockChain);
  (Patient.findByIdAndUpdate as jest.Mock).mockReturnValue(mockChain);

  const User = require('@/models/User').default;
  (User.findOne as jest.Mock).mockResolvedValue({
    _id: '1',
    email: 'admin@test.com',
    role: 'ADMIN',
  });
});

describe('GET /api/patients/[id]', () => {
  it('should return patient by id', async () => {
    const mockPatient = {
      _id: 'patient123',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@test.com',
      isActive: true,
    };

    mockExec.mockResolvedValue(mockPatient);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient123'
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: 'patient123' }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data._id).toBe('patient123');
    expect(data.data.firstName).toBe('Alice');
  });

  it('should return 404 if patient not found', async () => {
    mockExec.mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/nonexistent'
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Patient not found');
  });

  it('should return 400 for invalid id', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/patients/invalid-id'
    );
    const res = await GET(req, {
      params: Promise.resolve({ id: 'invalid-id' }),
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });
});

describe('PUT /api/patients/[id]', () => {
  it('should update patient successfully', async () => {
    const updatedData = {
      firstName: 'Alice',
      lastName: 'Johnson',
      phone: '0712345678',
      address: '456 New Street',
    };

    const mockUpdatedPatient = {
      _id: 'patient123',
      ...updatedData,
      email: 'alice@test.com',
      isActive: true,
    };

    mockExec.mockResolvedValue(mockUpdatedPatient);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient123',
      {
        method: 'PUT',
        body: JSON.stringify(updatedData),
      }
    );

    const res = await PUT(req, {
      params: Promise.resolve({ id: 'patient123' }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.firstName).toBe('Alice');
    expect(data.data.lastName).toBe('Johnson');
    expect(data.data.phone).toBe('0712345678');
    expect(data.message).toBe('Patient updated successfully');
  });

  it('should return 404 if patient not found for update', async () => {
    mockExec.mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/nonexistent',
      {
        method: 'PUT',
        body: JSON.stringify({ firstName: 'Updated' }),
      }
    );

    const res = await PUT(req, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Patient not found');
  });

  it('should handle validation errors', async () => {
    const invalidData = {
      email: 'invalid-email',
      phone: '123',
    };

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient123',
      {
        method: 'PUT',
        body: JSON.stringify(invalidData),
      }
    );

    const res = await PUT(req, {
      params: Promise.resolve({ id: 'patient123' }),
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors).toBeDefined();
  });
});

describe('DELETE /api/patients/[id]', () => {
  it('should soft delete patient (set isActive to false)', async () => {
    const mockPatient = {
      _id: 'patient123',
      firstName: 'Alice',
      isActive: true,
    };

    // First call for GET (in DELETE handler)
    (Patient.findById as jest.Mock).mockReturnValueOnce({
      ...mockChain,
      exec: jest.fn().mockResolvedValue(mockPatient),
    });

    // Second call for update (soft delete)
    mockExec.mockResolvedValue({
      ...mockPatient,
      isActive: false,
    });

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient123',
      {
        method: 'DELETE',
      }
    );

    const res = await DELETE(req, {
      params: Promise.resolve({ id: 'patient123' }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Patient deactivated successfully');
  });

  it('should return 404 if patient not found for deletion', async () => {
    (Patient.findById as jest.Mock).mockReturnValueOnce({
      ...mockChain,
      exec: jest.fn().mockResolvedValue(null),
    });

    const req = new NextRequest(
      'http://localhost:3000/api/patients/nonexistent',
      {
        method: 'DELETE',
      }
    );

    const res = await DELETE(req, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Patient not found');
  });

  it('should handle already deactivated patient', async () => {
    const deactivatedPatient = {
      _id: 'patient123',
      firstName: 'Alice',
      isActive: false,
    };

    (Patient.findById as jest.Mock).mockReturnValueOnce({
      ...mockChain,
      exec: jest.fn().mockResolvedValue(deactivatedPatient),
    });

    const req = new NextRequest(
      'http://localhost:3000/api/patients/patient123',
      {
        method: 'DELETE',
      }
    );

    const res = await DELETE(req, {
      params: Promise.resolve({ id: 'patient123' }),
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Patient is already deactivated');
  });
});
