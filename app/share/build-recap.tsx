import type { BuildRecap as Recap } from '../../lib/build-recap';

export function BuildRecap({ recap }: { recap: Recap }) {
  return <section className="build-recap" aria-labelledby="recap-heading">
    <div><p className="eyebrow">Your rhythm · last 7 days</p><h2 id="recap-heading">{recap.activeDays ? 'Little sessions. Real momentum.' : 'Your next chapter is unwritten.'}</h2>
      <p>{recap.start} → {recap.end} · UTC</p></div>
    <ol className="recap-days" aria-label="Recorded activity over the last seven days">{recap.days.map((day) => <li key={day.date} className={day.active ? 'active' : ''}>
      <span aria-hidden="true">{day.active ? '✦' : '·'}</span><time dateTime={day.date}>{new Date(`${day.date}T00:00:00Z`).toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' })}</time>
      <span className="sr-only">{day.date}: {day.active ? 'activity recorded' : 'no activity recorded; coverage may be incomplete'}</span>
    </li>)}</ol>
    {recap.activeDays ? <dl><div><dt>Recorded active days</dt><dd>{recap.activeDays}<small> / 7</small></dd></div><div><dt>Longest run this week</dt><dd>{recap.longestRun}<small> {recap.longestRun === 1 ? 'day' : 'days'}</small></dd></div><div><dt>Tools reporting tokens</dt><dd>{recap.tokenSources || 'None reported'}</dd></div></dl>
      : <p>No recent activity has arrived yet. Use your coding tools, then sync when you’re ready. Your existing card is still here.</p>}
    <p className="recap-coverage">This recap shows the activity we received. Blank days may mean missing history. It does not measure productivity.</p>
  </section>;
}
