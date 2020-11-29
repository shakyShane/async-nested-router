import React from 'react';
import { DataLoader, Link, Resolver, RouterProvider, useResolveData, useRouteData } from './Router';
import classes from './Users.module.css';

const waiter = () => new Promise((res) => setTimeout(res, 200));

const dataLoader1: DataLoader = (data) => {
    return new Promise((res) => setTimeout(() => res([{ name: 'tshirt', price: 'here' }]), 200));
};

const resolver1: Resolver = async (location, depth) => {
    await waiter();
    const upto = location.pathname.slice(1).split('/');
    const sliced = upto[depth];
    const match = (() => {
        switch (sliced) {
            case 'orders':
                return import('./Orders');
            //     ;
            default:
                return import('./Dashboard');
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
        component: (await (match as any)).default,
        query: {},
        params: {},
    };
};

const fallback = () => 'please wait....';

export function UserPage() {
    const data = useRouteData();
    const resolve = useResolveData();
    return (
        <div style={{ padding: '20px', border: '1px dotted red' }}>
            <h1>Users Page</h1>
            <pre>resolveData: {JSON.stringify(resolve)}</pre>
            <pre>routeData: {JSON.stringify(data)}</pre>
            <div className={classes.grid}>
                <div className={classes.sidebar}>
                    <ul>
                        <li>
                            <Link to={'/user'}>dashboard</Link>
                        </li>
                        <li>
                            <Link to={'/user/orders'}>orders</Link>
                        </li>
                    </ul>
                </div>
                <div className={classes.content}>
                    {data.loading === false && (
                        <RouterProvider
                            dataLoader={dataLoader1}
                            resolver={resolver1}
                            fallback={fallback}
                            segs={['orders', 'dashboard']}
                            current={'orders'}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default UserPage;
