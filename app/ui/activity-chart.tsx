'use client';

import { useState } from 'react';
import { activityWindow, type ActivityDay, type ActivityRange } from '../../lib/activity-window';

const ranges = [['12w', '12 weeks'], ['6m', '6 months'], ['year', 'Year']] as const;
const formatDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function ActivityChart({ activity, title = 'Momentum, not volume' }: { activity: ActivityDay[]; title?: string }) {
  const [range, setRange] = useState<ActivityRange>('12w');
  const window = activityWindow(activity, range);
  return <div className="activity-explorer">
    <div className="card-head"><div><p className="eyebrow">Coding activity</p><h2>{title}</h2></div>
      <div className="segmented activity-range" role="group" aria-label="Activity range">{ranges.map(([value, label]) => <button type="button" key={value} className={range === value ? 'selected' : ''} aria-pressed={range === value} onClick={() => setRange(value)}>{label}</button>)}</div>
    </div>
    {!window ? <p>No activity history yet. Connect a tool to start your calendar.</p> : <>
      <p className="activity-window-summary" aria-live="polite"><strong>{window.activeDays} active days</strong> · {formatDate(window.start)} – {formatDate(window.end)} · UTC</p>
      <div className="activity-scroll" tabIndex={0} role="region" aria-label="Coding activity calendar; scroll horizontally to explore longer ranges">
        <div className={`activity-calendar ${range === '12w' ? '' : 'activity-calendar-long'}`}>
          <div className="activity-weekdays" aria-hidden="true">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="activity-grid" role="img" aria-label={`${window.activeDays} active days from ${formatDate(window.start)} to ${formatDate(window.end)}. ${window.missingDays} days of history unavailable.`}>
            {Array.from({ length: window.leading }, (_, index) => <span key={`before-${index}`} aria-hidden="true"/>)}
            {window.days.map((day) => <span key={day.date} className={day.value === null ? 'heat activity-unavailable' : `heat level-${day.value}`} title={`${formatDate(day.date)}: ${day.value === null ? 'History unavailable' : day.value > 0 ? `Recorded activity level ${day.value} of 4` : 'No recorded activity'}`}/>)}
            {Array.from({ length: window.trailing }, (_, index) => <span key={`after-${index}`} aria-hidden="true"/>)}
          </div>
        </div>
      </div>
      <p className="activity-chart-note">Colour shows recorded activity, not token volume. Scroll sideways on small screens.{window.missingDays > 0 ? ` ${window.missingDays} days of history are unavailable, not measured zero.` : ''}</p>
    </>}
  </div>;
}
