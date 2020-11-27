import React from 'react';
import { matchPath } from 'react-router';
import {
    DataLoader,
    Link,
    Resolver,
    RouterProvider,
    useResolveData,
    useRouteData,
} from './Router';

const waiter = () => new Promise((res) => setTimeout(res, 1000));

const dataLoader1: DataLoader = (args) => {
    return new Promise((res) =>
        setTimeout(
            () => res([{ name: 'tshirt', price: 'here', id: args.params?.id }]),
            1000,
        ),
    );
};

const resolver1: Resolver = async (loc) => {
    const output = matchPath(loc.pathname, '/user/orders/:id');
    await waiter();
    return {
        component: (await import('./Order')).default,
        query: {},
        params: output ? output.params : {},
    };
};

const fallback = () => 'please wait....';

export function UsersPage() {
    const data = useRouteData();
    const resolve = useResolveData();
    return (
        <div style={{ padding: '20px', border: '1px dotted red' }}>
            <h1>Orders Page</h1>
            <pre>routeData: {JSON.stringify(data)}</pre>
            <pre>resolveData: {JSON.stringify(resolve)}</pre>
            <ul>
                <li>
                    <Link to={'/user/orders/13'}>Order 13</Link>
                    <Link to={'/user/orders/12'}>Order 12</Link>
                </li>
            </ul>
            <RouterProvider
                dataLoader={dataLoader1}
                resolver={resolver1}
                fallback={fallback}
                seg={':id'}
            />
        </div>
    );
}

export default UsersPage;
