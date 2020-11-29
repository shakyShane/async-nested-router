import React from 'react';
import { Link, useResolveData, useRouteData } from './Router';

export function Dashboard() {
    const data = useRouteData();
    const resolve = useResolveData();
    return (
        <div style={{ padding: '20px', border: '1px solid pink' }}>
            <h1>Dashboard</h1>
            <ul>
                <li>
                    <Link to="/user/orders/13">Order 13</Link>
                </li>
            </ul>
            <pre>routeData: {JSON.stringify(data, null, 2)}</pre>
            <pre>resolveData: {JSON.stringify(resolve, null, 2)}</pre>
        </div>
    );
}

export default Dashboard;
