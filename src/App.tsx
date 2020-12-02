import React from 'react';
import './App.css';
import { BaseRouter, DataLoader, Link, Resolver, RouterProvider } from './Router';
import { inspect } from '@xstate/inspect';

inspect({ iframe: false });

const waiter = () => new Promise((res) => setTimeout(res, 200));

const dataLoader1: DataLoader = (resolveData) => {
    return new Promise((res) => setTimeout(() => res({ name: 'shane' }), 200));
};

const resolver1: Resolver = async (location, depth) => {
    await waiter();
    const upto = location.pathname.slice(1).split('/');
    const sliced = upto[depth];
    const match = (() => {
        if (location.pathname === '/') {
            return import('./Home');
        }
        switch (sliced) {
            case 'user':
                return import('./User');
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
const segs = ['user', '/'];

export default function App() {
    return (
        <BaseRouter>
            <main>
                <p>
                    <Link to={'/'}>Home</Link>
                </p>
                <RouterProvider
                    dataLoader={dataLoader1}
                    resolver={resolver1}
                    fallback={fallback}
                    segs={segs}
                />
                {/*<Router>*/}
                {/*    <OrdersPage name={'first'} />*/}
                {/*    <Router>*/}
                {/*        <ItemPage name={'item 1'} />*/}
                {/*    </Router>*/}
                {/*</Router>*/}
                {/*<Router>*/}
                {/*    <OrdersPage name={'second'} />*/}
                {/*    <Router>*/}
                {/*        <ItemPage name={'item 2'} />*/}
                {/*    </Router>*/}
                {/*</Router>*/}
            </main>
        </BaseRouter>
    );
}
