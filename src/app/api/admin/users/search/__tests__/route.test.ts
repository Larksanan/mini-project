const mockExec = jest.fn();

const mockChain = {
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(), // Added select method
  exec: mockExec,
  then: (resolve: any, reject: any) => mockExec().then(resolve, reject),
};

jest.mock('next/server', () => ({
  NextRequest: class {
    url: string;
    private _body: any;

    constructor(url: string, init?: { method?: string; body?: string }) {
      this.url = url;
      this._body = init?.body;
    }

    async json() {
      return this._body ? JSON.parse(this._body) : {};
    }
  },
  NextResponse: {
    json: jest.fn((data: any, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: jest.fn().mockResolvedValue({
    user: { id: '1', email: 'admin@test.com' },
  }),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('@/models/Doctor', () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnValue(mockChain),
    countDocuments: jest.fn(),
  },
}));

jest.mock('@/models/Patient', () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnValue(mockChain),
    countDocuments: jest.fn(),
  },
}));

jest.mock('@/models/Receptionist', () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnValue(mockChain),
    countDocuments: jest.fn(),
  },
}));

jest.mock('@/lib/mongodb', () => ({
  connectDB: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import User from '@/models/User';
import Doctor from '@/models/Doctor';
import Patient from '@/models/Patient';
import Receptionist from '@/models/Receptionist';
import { getServerSession } from 'next-auth';

beforeEach(() => {
  jest.clearAllMocks();

  // Default User mock
  (User.findOne as jest.Mock).mockResolvedValue({
    _id: '1',
    email: 'admin@test.com',
    role: 'ADMIN',
  });

  mockExec.mockResolvedValue([]);
  (User.find as jest.Mock).mockReturnValue(mockChain);
  (User.countDocuments as jest.Mock).mockResolvedValue(0);
  (Doctor.countDocuments as jest.Mock).mockResolvedValue(0);
  (Patient.countDocuments as jest.Mock).mockResolvedValue(0);
  (Receptionist.countDocuments as jest.Mock).mockResolvedValue(0);
});

describe('GET /api/search', () => {
  it('returns 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost:3000/api/search?q=test');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Unauthorized');
  });

  it('returns 403 if user is not admin', async () => {
    (User.findOne as jest.Mock).mockResolvedValueOnce({
      _id: '2',
      email: 'user@test.com',
      role: 'USER',
    });

    const req = new NextRequest('http://localhost:3000/api/search?q=test');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Forbidden - Admin access required');
  });

  it('returns results with pagination for admin', async () => {
    // Add type=user to search only users, not all entity types
    const req = new NextRequest(
      'http://localhost:3000/api/search?q=Alice&page=1&limit=10&type=user'
    );
    mockExec.mockResolvedValue([
      { _id: '1', name: 'Alice', email: 'alice@test.com' },
    ]);
    (User.countDocuments as jest.Mock).mockResolvedValue(1);

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.pagination.total).toBe(1);
    expect(data.pagination.page).toBe(1);
    // When type=user, results are in data.results (not data.data.results)
    expect(data.data.results).toHaveLength(1);
    expect(data.data.results[0].name).toBe('Alice');
    expect(data.data.results[0].type).toBe('USER');
  });
});

// -------------------- POST Endpoint Tests -------------------- //

describe('POST /api/search', () => {
  it('returns 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'Alice' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('returns 403 if user is not admin', async () => {
    (User.findOne as jest.Mock).mockResolvedValueOnce({
      _id: '2',
      email: 'user@test.com',
      role: 'USER',
    });

    const req = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'Alice' }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
  });

  it('returns search results with pagination for admin', async () => {
    const req = new NextRequest('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'Alice',
        pagination: { page: 1, limit: 10 },
      }),
    });

    mockExec.mockResolvedValue([
      { _id: '1', name: 'Alice', email: 'alice@test.com' },
    ]);
    (User.countDocuments as jest.Mock).mockResolvedValue(1);

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.pagination.total).toBe(1);
    expect(data.data).toHaveLength(1);
  });
});
