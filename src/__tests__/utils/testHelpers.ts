import { Session } from 'next-auth';
import { UserRole } from '@/models/User';

export const createMockSession = (overrides?: Partial<Session>): Session => {
  return {
    user: {
      id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      name: 'jebarsan Thatcroos',
      role: 'USER' as UserRole,
      ...overrides?.user,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
};

export const createMockUser = (overrides?: any) => {
  return {
    _id: '507f1f77bcf86cd799439011',
    name: 'jebarsan Thatcroos',
    email: 'test@example.com',
    nic: '123456789V',
    role: 'USER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

export const createMockRequest = (body: any) => {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
    method: 'PUT',
  } as any;
};

export const mockNotificationPreferences = {
  default: {
    emailNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    appointmentReminders: true,
    messageAlerts: true,
    systemUpdates: true,
    marketingEmails: false,
  },
  allDisabled: {
    emailNotifications: false,
    pushNotifications: false,
    inAppNotifications: false,
    appointmentReminders: false,
    messageAlerts: false,
    systemUpdates: false,
    marketingEmails: false,
  },
  allEnabled: {
    emailNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    appointmentReminders: true,
    messageAlerts: true,
    systemUpdates: true,
    marketingEmails: true,
  },
  custom: {
    emailNotifications: false,
    pushNotifications: true,
    inAppNotifications: false,
    appointmentReminders: true,
    messageAlerts: false,
    systemUpdates: true,
    marketingEmails: true,
  },
};
