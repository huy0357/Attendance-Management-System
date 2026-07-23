import React, { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthContext';
import { scheduleApi } from '../api/attendanceCore.api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getStartOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (d: Date, days: number): Date => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};

const deriveShiftColor = (isNightShift: boolean, startTime: string) => {
  if (isNightShift) return { bg: 'rgba(23, 162, 184, 0.1)', border: 'var(--nm-info)', text: 'var(--nm-info)' };
  const hour = parseInt(startTime.split(':')[0], 10);
  if (hour >= 12) return { bg: 'rgba(255, 193, 7, 0.1)', border: 'var(--nm-warning)', text: 'var(--nm-warning)' };
  return { bg: 'rgba(40, 167, 69, 0.1)', border: 'var(--nm-success)', text: 'var(--nm-success)' };
};

const MySchedulePage: React.FC = () => {
  const { getEmployeeId } = useAuth();
  const employeeId = getEmployeeId();
  
  const [weekStart, setWeekStart] = useState<Date>(getStartOfWeek(new Date()));

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['myScheduleShifts', employeeId, formatDate(weekStart)],
    queryFn: () => {
      if (!employeeId) return Promise.resolve([]);
      // Ensure employeeId is passed as an array of numbers to match getInitialShifts signature
      return scheduleApi.getInitialShifts([Number(employeeId)], weekStart);
    },
    enabled: !!employeeId
  });

  const handlePrevWeek = () => setWeekStart(prev => addDays(prev, -7));
  const handleNextWeek = () => setWeekStart(prev => addDays(prev, 7));
  const handleCurrentWeek = () => setWeekStart(getStartOfWeek(new Date()));

  return (
    <div style={{ padding: 'var(--nm-space-6)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--nm-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nm-primary)', boxShadow: 'var(--nm-shadow-out)' }}>
            <CalendarDays style={{ width: '24px', height: '24px' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--nm-text)', margin: 0 }}>My Schedule</h1>
            <p style={{ color: 'var(--nm-text-muted)', fontSize: '14px', margin: 0 }}>View your assigned weekly shifts</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={handleCurrentWeek}
            className="nm-button-secondary"
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'var(--nm-surface)', boxShadow: 'var(--nm-shadow-out)', color: 'var(--nm-text)', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Today
          </button>
          <div style={{ display: 'flex', background: 'var(--nm-surface)', borderRadius: '8px', boxShadow: 'var(--nm-shadow-out)' }}>
            <button 
              onClick={handlePrevWeek}
              style={{ padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--nm-text)' }}
            >
              <ChevronLeft size={20} />
            </button>
            <div style={{ padding: '8px 16px', fontWeight: 'bold', minWidth: '220px', textAlign: 'center', color: 'var(--nm-primary)' }}>
              {formatDate(weekStart)} &nbsp;—&nbsp; {formatDate(addDays(weekStart, 6))}
            </div>
            <button 
              onClick={handleNextWeek}
              style={{ padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--nm-text)' }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--nm-surface)', padding: '24px', borderRadius: '16px', boxShadow: 'var(--nm-shadow-out)' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div className="nm-spinner" />
          </div>
        ) : !employeeId ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--nm-text-muted)' }}>
            Your account is not linked to an employee profile.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '16px' }}>
            {DAYS.map((day, i) => {
              const currentDayDate = addDays(weekStart, i);
              const formattedDateStr = formatDate(currentDayDate);
              // In Shift interface, 'day' maps to 0-6 index
              const shift = shifts.find(s => s.day === i);
              
              const isToday = formatDate(new Date()) === formattedDateStr;

              return (
                <div key={i} style={{ 
                  background: isToday ? 'var(--nm-surface)' : 'var(--nm-surface-deep)', 
                  borderRadius: '12px', 
                  padding: '16px', 
                  boxShadow: isToday ? 'var(--nm-shadow-out)' : 'var(--nm-shadow-in)',
                  border: isToday ? '2px solid var(--nm-primary)' : '2px solid transparent',
                  minHeight: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                }}>
                  <div style={{ marginBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '12px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: isToday ? 'var(--nm-primary)' : 'var(--nm-text)', marginBottom: '4px' }}>{day}</div>
                    <div style={{ fontSize: '13px', color: 'var(--nm-text-muted)' }}>{formattedDateStr}</div>
                  </div>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {shift ? (
                      (() => {
                        const colors = deriveShiftColor(shift.type === 'night', shift.startTime);
                        return (
                          <div style={{ 
                            background: colors.bg, 
                            border: `1px solid ${colors.border}`, 
                            borderRadius: '8px', 
                            padding: '12px 8px', 
                            textAlign: 'center' 
                          }}>
                            <Clock size={16} color={colors.text} style={{ margin: '0 auto 8px auto' }} />
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: colors.text, marginBottom: '4px' }}>
                              {shift.startTime.substring(0, 5)} - {shift.endTime.substring(0, 5)}
                            </div>
                            <div style={{ fontSize: '12px', color: colors.text, opacity: 0.8, textTransform: 'capitalize' }}>
                              {shift.type} Shift
                            </div>
                            {shift.scheduleSource === 'IMPORT' && (
                              <div style={{ fontSize: '10px', background: colors.border, color: 'white', display: 'inline-block', padding: '2px 6px', borderRadius: '4px', marginTop: '8px', fontWeight: 'bold' }}>
                                IMPORTED
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div style={{ color: 'var(--nm-text-muted)', fontSize: '13px', fontStyle: 'italic', textAlign: 'center' }}>
                        No shift scheduled
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MySchedulePage;
