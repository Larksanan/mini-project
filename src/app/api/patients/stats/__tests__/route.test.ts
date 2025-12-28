/* eslint-disable @typescript-eslint/no-require-imports */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/patients/stats/route';
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
    user: { id: '1', email: 'jebarsanthatcroos@gmail.com' },
  }),
}));

jest.mock('@/models/Patient', () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    getPatientStats: jest.fn(),
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

  const User = require('@/models/User').default;
  (User.findOne as jest.Mock).mockResolvedValue({
    _id: '1',
    email: 'admin@test.com',
    role: 'ADMIN',
  });
});

describe('GET /api/patients/stats', () => {
  it('should return patient statistics', async () => {
    const mockStats = {
      total: 100,
      active: 85,
      inactive: 15,
      genderDistribution: {
        male: 45,
        female: 52,
        other: 3,
      },
      ageDistribution: {
        '0-18': 20,
        '19-35': 40,
        '36-50': 25,
        '51+': 15,
      },
      monthlyGrowth: 5,
      topCities: [
        { city: 'Colombo', count: 30 },
        { city: 'Kandy', count: 20 },
        { city: 'Galle', count: 15 },
      ],
    };

    (Patient.getPatientStats as jest.Mock).mockResolvedValue(mockStats);

    const req = new NextRequest('http://localhost:3000/api/patients/stats');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockStats);
    expect(Patient.getPatientStats).toHaveBeenCalled();
  });

  it('should return basic stats if getPatientStats is not available', async () => {
    // Mock that getPatientStats method doesn't exist
    (Patient.getPatientStats as jest.Mock).mockResolvedValue(null);

    (Patient.countDocuments as jest.Mock)
      .mockResolvedValueOnce(100) // Total
      .mockResolvedValueOnce(85); // Active

    (Patient.aggregate as jest.Mock).mockResolvedValue([
      {
        _id: { gender: 'MALE' },
        count: 45,
      },
      {
        _id: { gender: 'FEMALE' },
        count: 52,
      },
      {
        _id: { gender: 'OTHER' },
        count: 3,
      },
    ]);

    const req = new NextRequest('http://localhost:3000/api/patients/stats');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.total).toBe(100);
    expect(data.data.active).toBe(85);
    expect(data.data.inactive).toBe(15);
    expect(data.data.genderDistribution.male).toBe(45);
    expect(data.data.genderDistribution.female).toBe(52);
    expect(data.data.genderDistribution.other).toBe(3);
  });

  it('should handle empty database', async () => {
    (Patient.getPatientStats as jest.Mock).mockResolvedValue({
      total: 0,
      active: 0,
      inactive: 0,
      genderDistribution: {
        male: 0,
        female: 0,
        other: 0,
      },
      ageDistribution: {},
      monthlyGrowth: 0,
      topCities: [],
    });

    const req = new NextRequest('http://localhost:3000/api/patients/stats');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.total).toBe(0);
    expect(data.data.active).toBe(0);
  });

  it('should return 401 when not authenticated', async () => {
    const { getServerSession } = require('next-auth');
    getServerSession.mockResolvedValueOnce(null);

    const req = new NextRequest('http://localhost:3000/api/patients/stats');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Unauthorized');
  });

  it('should return 403 when not admin', async () => {
    const User = require('@/models/User').default;
    (User.findOne as jest.Mock).mockResolvedValue({
      _id: '1',
      email: 'user@test.com',
      role: 'USER',
    });

    const req = new NextRequest('http://localhost:3000/api/patients/stats');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Forbidden: Admin access required');
  });

  it('should handle database errors', async () => {
    (Patient.getPatientStats as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );

    const req = new NextRequest('http://localhost:3000/api/patients/stats');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Failed to fetch patient statistics');
  });
});
