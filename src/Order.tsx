import React from 'react';
import { useResolveData } from './Router';

function Order() {
    const resolve = useResolveData();
    console.log('could query here for order ', resolve.data.params.id);
    return (
        <div style={{ padding: '20px', border: '1px dotted red' }}>
            <h1>Order page</h1>
            <pre>resolveData: {JSON.stringify(resolve)}</pre>
        </div>
    );
}

export default Order;
