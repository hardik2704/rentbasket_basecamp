import { useState } from 'react';
import { ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { Header } from '../components/layout';
import { useApp } from '../context/AppContext';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    isToday,
    parseISO
} from 'date-fns';
import './CalendarPage.css';

export function CalendarPage() {
    const { tasks, projects } = useApp();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const tasksWithDates = tasks.filter(task => task.dueDate);

    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const goToToday = () => setCurrentMonth(new Date());

    const renderHeader = () => (
        <div className="calendar-header">
            <div className="calendar-nav">
                <button className="nav-btn" onClick={prevMonth}>
                    <ChevronLeft size={20} />
                </button>
                <h2 className="month-title">{format(currentMonth, 'MMMM yyyy')}</h2>
                <button className="nav-btn" onClick={nextMonth}>
                    <ChevronRight size={20} />
                </button>
            </div>
            <button className="btn btn-secondary" onClick={goToToday}>
                Today
            </button>
        </div>
    );

    const renderDays = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return (
            <div className="calendar-days">
                {days.map(day => (
                    <div key={day} className="day-name">{day}</div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const currentDay = day;
                const dayTasks = tasksWithDates.filter(task => {
                    const taskDate = parseISO(task.dueDate!);
                    return isSameDay(taskDate, currentDay);
                });

                const isCurrentMonth = isSameMonth(day, monthStart);
                const isCurrentDay = isToday(day);

                days.push(
                    <div
                        key={day.toString()}
                        className={`calendar-cell ${!isCurrentMonth ? 'disabled' : ''} ${isCurrentDay ? 'today' : ''}`}
                    >
                        <span className={`day-number ${isCurrentDay ? 'today' : ''}`}>
                            {format(day, 'd')}
                        </span>
                        <div className="cell-tasks">
                            {dayTasks.slice(0, 3).map(task => {
                                const project = projects.find(p => p.id === task.projectId);
                                return (
                                    <div
                                        key={task.id}
                                        className={`task-chip ${task.status}`}
                                        title={`${task.title} - ${project?.name || 'Unknown'}`}
                                    >
                                        <Circle size={6} />
                                        <span>{task.title}</span>
                                    </div>
                                );
                            })}
                            {dayTasks.length > 3 && (
                                <span className="more-tasks">+{dayTasks.length - 3} more</span>
                            )}
                        </div>
                    </div>
                );

                day = addDays(day, 1);
            }
            rows.push(
                <div key={day.toString()} className="calendar-row">
                    {days}
                </div>
            );
            days = [];
        }

        return <div className="calendar-body">{rows}</div>;
    };

    // Upcoming tasks for sidebar
    const upcomingTasks = tasksWithDates
        .filter(task => {
            const taskDate = parseISO(task.dueDate!);
            return taskDate >= new Date() && task.status !== 'done';
        })
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
        .slice(0, 5);

    return (
        <div className="calendar-page">
            <Header
                title="Calendar"
                subtitle="View tasks and deadlines"
            />

            <div className="calendar-content">
                <div className="calendar-main card">
                    {renderHeader()}
                    {renderDays()}
                    {renderCells()}
                </div>

                <aside className="calendar-sidebar">
                    <div className="sidebar-section card">
                        <h3>Upcoming Deadlines</h3>
                        {upcomingTasks.length === 0 ? (
                            <p className="no-tasks">No upcoming deadlines</p>
                        ) : (
                            <ul className="upcoming-list">
                                {upcomingTasks.map(task => {
                                    const project = projects.find(p => p.id === task.projectId);
                                    return (
                                        <li key={task.id} className="upcoming-item">
                                            <div className="upcoming-date">
                                                <span className="date-day">{format(parseISO(task.dueDate!), 'd')}</span>
                                                <span className="date-month">{format(parseISO(task.dueDate!), 'MMM')}</span>
                                            </div>
                                            <div className="upcoming-info">
                                                <span className="upcoming-title">{task.title}</span>
                                                <span className="upcoming-project">{project?.name}</span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <div className="sidebar-section card">
                        <h3>Legend</h3>
                        <div className="legend-list">
                            <div className="legend-item">
                                <Circle size={10} className="legend-icon new" />
                                <span>To Do</span>
                            </div>
                            <div className="legend-item">
                                <Circle size={10} className="legend-icon in_progress" />
                                <span>In Progress</span>
                            </div>
                            <div className="legend-item">
                                <Circle size={10} className="legend-icon done" />
                                <span>Done</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
