import { NextRequest } from 'next/server';
import { GET } from '@/app/api/patients/check/route';
import Patient from '@/models/Patient';

jest.mock('next/server', () => {
  return {
    NextRequest: class {
      url: string;
      constructor(url: string) {
        this.url = url;
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
    user: { id: '1', email: 'admin@test.com' },
  }),
}));

jest.mock('@/models/Patient', () => ({
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
  (Patient.findOne as jest.Mock).mockResolvedValue(null);
});

describe('GET /api/patients/check', () => {
  it('should check email and return exists: true', async () => {
    const mockPatient = {
      _id: 'patient123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      nic: '123456789V',
    };

    (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/check?email=test@example.com'
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.exists).toBe(true);
    expect(data.patient.email).toBe('test@example.com');
    expect(data.field).toBe('email');
  });

  it('should check email and return exists: false', async () => {
    (Patient.findOne as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/check?email=nonexistent@example.com'
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.exists).toBe(false);
    expect(data.message).toBe('No patient found with the provided credentials');
  });

  it('should check NIC and return exists: true', async () => {
    const mockPatient = {
      _id: 'patient123',
      nic: '200121901656',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    };

    (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/check?nic=200121901656'
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.exists).toBe(true);
    expect(data.patient.nic).toBe('200121901656');
    expect(data.field).toBe('NIC');
  });

  it('should return 400 if no query parameters provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/patients/check');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Either email or NIC parameter is required');
  });

  it('should return 400 if invalid query parameter', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/patients/check?invalid=param'
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Either email or NIC parameter is required');
  });

  it('should return 400 for invalid email format', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/patients/check?email=invalid-email'
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Invalid email format');
  });

  it('should return 400 for invalid NIC format', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/patients/check?nic=invalid'
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Invalid NIC format');
  });

  it('should handle database errors', async () => {
    // Suppress console.error for this test
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    (Patient.findOne as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );

    const req = new NextRequest(
      'http://localhost:3000/api/patients/check?email=test@example.com'
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Database error'); // The route returns error.message

    // Restore console
    consoleErrorSpy.mockRestore();
  });

  it('should return 401 when not authenticated', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getServerSession } = require('next-auth');
    getServerSession.mockResolvedValueOnce(null);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/check?email=test@example.com'
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Unauthorized');
  });

  it('should check both email and NIC with $or query', async () => {
    const mockPatient = {
      _id: 'patient123',
      email: 'test@example.com',
      nic: '200121901656',
      firstName: 'John',
      lastName: 'Doe',
    };

    (Patient.findOne as jest.Mock).mockResolvedValue(mockPatient);

    const req = new NextRequest(
      'http://localhost:3000/api/patients/check?email=test@example.com&nic=200121901656'
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.exists).toBe(true);

    // Verify findOne was called with $or query
    expect(Patient.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: true,
        $or: [{ email: 'test@example.com' }, { nic: '200121901656' }],
      })
    );
  });
});
