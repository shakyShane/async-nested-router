import React from 'react';
import { useResolveData, useRouteData } from './Router';

function Order() {
    const { loading: resolveLoading, data: resolveData } = useResolveData();
    const { loading, data, error } = useRouteData();
    return (
        <div style={{ padding: '20px', border: '1px dotted red' }}>
            <h1>Order page {loading || resolveLoading ? '...' : data.id}</h1>
            <pre>resolveData: {JSON.stringify(resolveData, null, 2)}</pre>
            <pre>routeData: {JSON.stringify(data, null, 2)}</pre>
        </div>
    );
}

export default Order;
