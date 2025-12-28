/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/doctor/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import MedicalRecord from '@/models/MedicalRecord';
import Appointment from '@/models/Appointment';
import { authOptions } from '@/app/api/auth/[...nextauth]/option';

interface AnalyticsData {
  overview: {
    totalPatients: number;
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    averageRating: number;
    totalRevenue: number;
    newPatients: number;
    returningPatients: number;
  };

  monthlyStats: any[];
  patientDemographics: any;
  appointmentTrends: any[];
  commonDiagnoses: any[];
  revenueAnalysis: any;
}

// Helper functions for analytics data
async function getMonthlyStats(
  doctorId: string,
  startDate: Date
): Promise<any[]> {
  try {
    const monthlyStats = await Appointment.aggregate([
      {
        $match: {
          doctor: doctorId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          appointments: { $sum: 1 },
          patients: { $addToSet: '$patient' },
        },
      },
      {
        $project: {
          month: {
            $let: {
              vars: {
                monthsInString: [
                  '',
                  'Jan',
                  'Feb',
                  'Mar',
                  'Apr',
                  'May',
                  'Jun',
                  'Jul',
                  'Aug',
                  'Sep',
                  'Oct',
                  'Nov',
                  'Dec',
                ],
              },
              in: {
                $arrayElemAt: ['$$monthsInString', '$_id.month'],
              },
            },
          },
          year: '$_id.year',
          appointments: 1,
          patients: { $size: '$patients' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);
    return monthlyStats;
  } catch (error) {
    console.error('Error in getMonthlyStats:', error);
    return [];
  }
}

/**
 * Retrieves patient demographic statistics for a specific doctor.
 *
 * Aggregates patient data from medical records to calculate age group distribution
 * and gender distribution for all patients associated with a doctor.
 *
 * @param {string} doctorId - The unique identifier of the doctor
 * @returns {Promise<PatientDemographics>} A promise that resolves to an object containing:
 *   - ageGroups: Object with counts for age ranges (under18, age18to35, age36to60, over60)
 *   - genderDistribution: Object with counts for genders (male, female, other)
 * @returns {Promise<{
 *   ageGroups: {
 *     under18: number;
 *     age18to35: number;
 *     age36to60: number;
 *     over60: number;
 *   },
 *   genderDistribution: {
 *     male: number;
 *     female: number;
 *     other: number;
 *   }
 * }>} Demographics object with default zero values if no data is found
 *
 * @throws Does not throw; returns default zero values on error
 *
 * @example
 * const demographics = await getPatientDemographics('doctor123');
 * console.log(demographics.ageGroups.under18); // 5
 * console.log(demographics.genderDistribution.male); // 8
 *
 * @note Age calculation is based on milliseconds per year (365 * 24 * 60 * 60 * 1000)
 *       which may not account for leap years. Consider using a date library for precision.
 *
 * @todo Refactor age calculation logic to use a dedicated utility function
 * @todo Add pagination support for large datasets
 * @todo Add caching to improve performance for frequently accessed data
 */
async function getPatientDemographics(doctorId: string): Promise<any> {
  try {
    const ageGroups = await MedicalRecord.aggregate([
      { $match: { doctor: doctorId } },
      {
        $lookup: {
          from: 'patients',
          localField: 'patient',
          foreignField: '_id',
          as: 'patientData',
        },
      },
      {
        $unwind: '$patientData',
      },
      {
        $group: {
          _id: null,
          totalPatients: { $addToSet: '$patient' },
          ageGroups: {
            $push: {
              $cond: [
                {
                  $lt: [
                    {
                      $divide: [
                        { $subtract: [new Date(), '$patientData.dateOfBirth'] },
                        365 * 24 * 60 * 60 * 1000,
                      ],
                    },
                    18,
                  ],
                },
                'under18',
                {
                  $cond: [
                    {
                      $lt: [
                        {
                          $divide: [
                            {
                              $subtract: [
                                new Date(),
                                '$patientData.dateOfBirth',
                              ],
                            },
                            365 * 24 * 60 * 60 * 1000,
                          ],
                        },
                        36,
                      ],
                    },
                    'age18to35',
                    {
                      $cond: [
                        {
                          $lt: [
                            {
                              $divide: [
                                {
                                  $subtract: [
                                    new Date(),
                                    '$patientData.dateOfBirth',
                                  ],
                                },
                                365 * 24 * 60 * 60 * 1000,
                              ],
                            },
                            61,
                          ],
                        },
                        'age36to60',
                        'over60',
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
      {
        $project: {
          totalPatients: { $size: '$totalPatients' },
          ageGroups: {
            under18: {
              $size: {
                $filter: {
                  input: '$ageGroups',
                  as: 'age',
                  cond: { $eq: ['$$age', 'under18'] },
                },
              },
            },
            age18to35: {
              $size: {
                $filter: {
                  input: '$ageGroups',
                  as: 'age',
                  cond: { $eq: ['$$age', 'age18to35'] },
                },
              },
            },
            age36to60: {
              $size: {
                $filter: {
                  input: '$ageGroups',
                  as: 'age',
                  cond: { $eq: ['$$age', 'age36to60'] },
                },
              },
            },
            over60: {
              $size: {
                $filter: {
                  input: '$ageGroups',
                  as: 'age',
                  cond: { $eq: ['$$age', 'over60'] },
                },
              },
            },
          },
        },
      },
    ]);

    const genderDistribution = await MedicalRecord.aggregate([
      { $match: { doctor: doctorId } },
      {
        $lookup: {
          from: 'patients',
          localField: 'patient',
          foreignField: '_id',
          as: 'patientData',
        },
      },
      {
        $unwind: '$patientData',
      },
      {
        $group: {
          _id: '$patientData.gender',
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      ageGroups: ageGroups[0]?.ageGroups || {
        under18: 0,
        age18to35: 0,
        age36to60: 0,
        over60: 0,
      },
      genderDistribution: {
        male: genderDistribution.find(g => g._id === 'male')?.count || 0,
        female: genderDistribution.find(g => g._id === 'female')?.count || 0,
        other: genderDistribution.find(g => g._id === 'other')?.count || 0,
      },
    };
  } catch (error) {
    console.error('Error in getPatientDemographics:', error);
    return {
      ageGroups: { under18: 0, age18to35: 0, age36to60: 0, over60: 0 },
      genderDistribution: { male: 0, female: 0, other: 0 },
    };
  }
}

async function getAppointmentTrends(
  doctorId: string,
  startDate: Date
): Promise<any[]> {
  try {
    const byDay = await Appointment.aggregate([
      {
        $match: {
          doctor: doctorId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          day: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 1] }, then: 'Sunday' },
                { case: { $eq: ['$_id', 2] }, then: 'Monday' },
                { case: { $eq: ['$_id', 3] }, then: 'Tuesday' },
                { case: { $eq: ['$_id', 4] }, then: 'Wednesday' },
                { case: { $eq: ['$_id', 5] }, then: 'Thursday' },
                { case: { $eq: ['$_id', 6] }, then: 'Friday' },
                { case: { $eq: ['$_id', 7] }, then: 'Saturday' },
              ],
              default: 'Unknown',
            },
          },
          count: 1,
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const byTime = await Appointment.aggregate([
      {
        $match: {
          doctor: doctorId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          time: {
            $concat: [{ $toString: '$_id' }, ':00'],
          },
          count: 1,
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return [
      { type: 'byDay', data: byDay },
      { type: 'byTime', data: byTime },
    ];
  } catch (error) {
    console.error('Error in getAppointmentTrends:', error);
    return [];
  }
}

async function getCommonDiagnoses(
  doctorId: string,
  startDate: Date
): Promise<any[]> {
  try {
    const diagnoses = await MedicalRecord.aggregate([
      {
        $match: {
          doctor: doctorId,
          createdAt: { $gte: startDate },
          diagnosis: { $exists: true, $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: '$diagnosis',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          diagnosis: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ]);

    const totalDiagnoses = diagnoses.reduce((sum, item) => sum + item.count, 0);

    return diagnoses.map(item => ({
      ...item,
      percentage: totalDiagnoses > 0 ? item.count / totalDiagnoses : 0,
    }));
  } catch (error) {
    console.error('Error in getCommonDiagnoses:', error);
    return [];
  }
}

async function getRevenueAnalysis(
  doctorId: string,
  startDate: Date
): Promise<any> {
  try {
    const monthlyRevenue = await Appointment.aggregate([
      {
        $match: {
          doctor: doctorId,
          createdAt: { $gte: startDate },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$consultationFee' },
        },
      },
      {
        $project: {
          month: {
            $let: {
              vars: {
                monthsInString: [
                  '',
                  'Jan',
                  'Feb',
                  'Mar',
                  'Apr',
                  'May',
                  'Jun',
                  'Jul',
                  'Aug',
                  'Sep',
                  'Oct',
                  'Nov',
                  'Dec',
                ],
              },
              in: {
                $arrayElemAt: ['$$monthsInString', '$_id.month'],
              },
            },
          },
          year: '$_id.year',
          revenue: 1,
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Calculate growth percentages
    const monthlyRevenueWithGrowth = monthlyRevenue.map(
      (month, index, array) => {
        const previousMonth = array[index - 1];
        const growth = previousMonth
          ? ((month.revenue - previousMonth.revenue) / previousMonth.revenue) *
            100
          : 0;
        return {
          ...month,
          growth: Math.round(growth * 10) / 10, // Round to 1 decimal place
        };
      }
    );

    const byService = await MedicalRecord.aggregate([
      {
        $match: {
          doctor: doctorId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$visitType',
          revenue: { $sum: '$consultationFee' },
        },
      },
      {
        $project: {
          service: '$_id',
          revenue: 1,
          _id: 0,
        },
      },
    ]);

    const totalRevenue = byService.reduce(
      (sum, service) => sum + service.revenue,
      0
    );
    const byServiceWithPercentage = byService.map(service => ({
      ...service,
      percentage: totalRevenue > 0 ? service.revenue / totalRevenue : 0,
    }));

    return {
      monthlyRevenue: monthlyRevenueWithGrowth,
      byService: byServiceWithPercentage,
    };
  } catch (error) {
    console.error('Error in getRevenueAnalysis:', error);
    return {
      monthlyRevenue: [],
      byService: [],
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'DOCTOR') {
      return NextResponse.json(
        { error: 'Forbidden - Doctor access required' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30days';
    const doctorId = session.user.id;

    // Calculate date range based on the selected period
    const now = new Date();
    const startDate = new Date();

    switch (range) {
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default: // 30 days
        startDate.setDate(now.getDate() - 30);
    }

    // Fetch analytics data in parallel
    const [
      totalPatients,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      monthlyStatsData,
      patientDemographicsData,
      appointmentTrendsData,
      commonDiagnosesData,
      revenueAnalysisData,
    ] = await Promise.all([
      // Total patients
      MedicalRecord.distinct('patient', { doctor: doctorId }),

      // Appointment counts
      Appointment.countDocuments({
        doctor: doctorId,
        createdAt: { $gte: startDate },
      }),
      Appointment.countDocuments({
        doctor: doctorId,
        status: 'completed',
        createdAt: { $gte: startDate },
      }),
      Appointment.countDocuments({
        doctor: doctorId,
        status: 'cancelled',
        createdAt: { $gte: startDate },
      }),

      // Monthly stats
      getMonthlyStats(doctorId, startDate),

      // Patient demographics
      getPatientDemographics(doctorId),

      // Appointment trends
      getAppointmentTrends(doctorId, startDate),

      // Common diagnoses
      getCommonDiagnoses(doctorId, startDate),

      // Revenue analysis
      getRevenueAnalysis(doctorId, startDate),
    ]);

    const analyticsData: AnalyticsData = {
      overview: {
        totalPatients: totalPatients.length,
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        averageRating: 4.7, // This would come from your rating system
        totalRevenue: revenueAnalysisData.monthlyRevenue.reduce(
          (sum: number, month: any) => sum + month.revenue,
          0
        ),
        newPatients: Math.floor(totalPatients.length * 0.3), // Example calculation
        returningPatients: Math.floor(totalPatients.length * 0.7), // Example calculation
      },
      monthlyStats: monthlyStatsData,
      patientDemographics: patientDemographicsData,
      appointmentTrends: appointmentTrendsData,
      commonDiagnoses: commonDiagnosesData,
      revenueAnalysis: revenueAnalysisData,
    };

    return NextResponse.json({
      success: true,
      data: analyticsData,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
