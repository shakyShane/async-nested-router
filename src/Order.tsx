import React from 'react';
import { useResolveData, useRouteData } from './Router';

function Order() {
    const resolve = useResolveData();
    const routeData = useRouteData();
    return (
        <div style={{ padding: '20px', border: '1px dotted red' }}>
            <h1>Order page</h1>
            <pre>resolveData: {JSON.stringify(resolve)}</pre>
            <pre>routeData: {JSON.stringify(routeData)}</pre>
        </div>
    );
}

export default Order;
