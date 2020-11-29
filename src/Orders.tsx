import React from 'react';
import { matchPath } from 'react-router';
import { DataLoader, Link, Resolver, RouterProvider, useResolveData, useRouteData } from './Router';

const waiter = () => new Promise((res) => setTimeout(res, 200));

const dataLoader1: DataLoader = (args) => {
    return new Promise((res) =>
        setTimeout(
            () =>
                res({
                    items: [{ name: 'tshirt', price: 'here' }],
                    id: args.params?.id,
                }),
            200,
        ),
    );
};

const resolver1: Resolver = async (loc) => {
    const match = matchPath(loc.pathname, '/user/orders/:id');
    await waiter();
    if (!match) {
        return {
            query: {},
            params: {},
            status: 404,
        };
    }
    console.log('here');
    return {
        component: (await import('./Order')).default,
        query: {},
        params: match ? match.params : {},
    };
};

const fallback = () => 'please wait....';

export function UsersPage() {
    const data = useRouteData();
    const resolve = useResolveData();
    return (
        <div style={{ padding: '20px', border: '1px dotted red' }}>
            <h1>Orders Page</h1>
            <pre>resolveData: {JSON.stringify(resolve, null, 2)}</pre>
            <pre>routeData: {JSON.stringify(data, null, 2)}</pre>
            <ul>
                <li>
                    <Link to={'/user/orders/13'}>Order 13</Link>
                </li>
                <li>
                    <Link to={'/user/orders/12'}>Order 12</Link>
                </li>
            </ul>
            <RouterProvider
                dataLoader={dataLoader1}
                resolver={resolver1}
                fallback={fallback}
                segs={[':id']}
                current={':id'}
            />
        </div>
    );
}

export default UsersPage;
