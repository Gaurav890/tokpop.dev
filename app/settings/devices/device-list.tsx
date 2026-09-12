'use client';

import { useState } from 'react';

type Device = { id: string; name: string; status: string; lastSeenAt: string | null; createdAt: string };
export function DeviceList({ initial }: { initial: Device[] }) {
  const [devices, setDevices] = useState(initial);
  async function revoke(id: string) { const response = await fetch(`/api/v1/devices/${id}`, { method: 'DELETE' }); if (response.ok) setDevices((items) => items.map((item) => item.id === id ? { ...item, status: 'revoked' } : item)); }
  return <section className="device-list">{devices.length ? devices.map((device) => <article key={device.id}><span className={`device-icon ${device.status}`}>⌁</span><div><h2>{device.name}</h2><p>{device.lastSeenAt ? `Last sync ${new Date(device.lastSeenAt).toLocaleString()}` : 'Never synchronized'} · Added {new Date(device.createdAt).toLocaleDateString()}</p></div><span className="proof-chip">{device.status}</span>{device.status === 'approved' && <button className="danger-button small" onClick={() => revoke(device.id)}>Revoke</button>}</article>) : <div className="empty-state"><h2>No connected devices</h2><p>Run <code>npx ai-native-profile connect</code> to add one.</p></div>}</section>;
}
