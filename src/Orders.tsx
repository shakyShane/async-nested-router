import React from 'react';
import { matchPath } from 'react-router';
import {
    Link,
    Resolver,
    RouterProvider,
    useResolveData,
    useRouteData,
} from './Router';

const waiter = () => new Promise((res) => setTimeout(res, 1000));

const resolver1: Resolver = async (pathname) => {
    console.log(pathname);
    const output = matchPath(pathname, '/user/orders/:id');
    await waiter();
    return {
        component: await import('./Order'),
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
                </li>
            </ul>
            <RouterProvider resolver={resolver1} fallback={fallback} />
        </div>
    );
}

export default UsersPage;
