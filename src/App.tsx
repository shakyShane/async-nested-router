import React from 'react';
import './App.css';
import { BaseRouter, Resolver, RouterProvider } from './Router';
import { inspect } from '@xstate/inspect';

inspect({ iframe: false });

const waiter = () => new Promise((res) => setTimeout(res, 1000));

const dataLoader1 = () =>
    new Promise((res) => setTimeout(() => res({ name: 'shane' }), 1000));

const resolver1: Resolver = async (args) => {
    await waiter();
    return {
        component: (await import('./Users')).default,
        query: {},
        params: {},
    };
};

const fallback = () => 'please wait....';

export default function App() {
    const path = '/user/orders/12';
    return (
        <BaseRouter>
            <main>
                <code>PATH: `/user/orders/12`</code>
                <RouterProvider
                    dataLoader={dataLoader1}
                    resolver={resolver1}
                    fallback={fallback}
                    seg={'user'}
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
