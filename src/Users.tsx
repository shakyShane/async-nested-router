import React from 'react';
import {
    Link,
    Resolver,
    RouterProvider,
    useResolveData,
    useRouteData,
} from './Router';

const waiter = () => new Promise((res) => setTimeout(res, 1000));

const dataLoader1 = () => {
    return new Promise((res) =>
        setTimeout(() => res([{ name: 'tshirt', price: 'here' }]), 1000),
    );
};

const resolver1: Resolver = async (location, depth) => {
    await waiter();

    const upto = location.pathname.slice(1).split('/');
    const sliced = upto[depth];
    const match = (async () => {
        switch (sliced) {
            case 'orders':
                return import('./Orders');
            case 'dashboard':
                return import('./Dashboard');
            default:
                return undefined;
        }
    })();

    if (!match) {
        return {
            query: {},
            params: {},
            status: 404,
        };
    }

    return {
        component: (await match).default,
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
