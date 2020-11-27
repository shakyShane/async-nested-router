import React from 'react';
import {
    Resolver,
    RouterProvider,
    useResolveData,
    useRouteData,
} from './Router';

const waiter = () => new Promise((res) => setTimeout(res, 1000));

const dataLoader1 = () =>
    new Promise((res) =>
        setTimeout(() => res([{ name: 'tshirt', price: 'here' }]), 1000),
    );

const resolver1: Resolver = async (args) => {
    await waiter();
    return {
        component: (await import('./Orders')).default,
        query: {},
        params: {},
    };
};

const fallback = () => 'please wait....';

export function UsersPage() {
    const data = useRouteData();
    const resolve = useResolveData();
    return (
        <div style={{ padding: '20px', border: '1px dotted red' }}>
            <h1>Users Page</h1>
            <pre>routeData: {JSON.stringify(data)}</pre>
            <pre>resolveData: {JSON.stringify(resolve)}</pre>

            <RouterProvider
                dataLoader={dataLoader1}
                resolver={resolver1}
                fallback={fallback}
                seg={'orders'}
            />
        </div>
    );
}

export default UsersPage;
