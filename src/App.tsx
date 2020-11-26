import React, { useContext } from 'react';
import './App.css';
import { Outlet, RouterContext } from './Router';
import { inspect } from '@xstate/inspect';

inspect({ iframe: false });

export default function App() {
    const path = '/user/orders/12';
    return (
        <main>
            <Outlet>
                <User />
                <Outlet>
                    <Order />
                    <Outlet>
                        <Item />
                    </Outlet>
                </Outlet>
                <Outlet>
                    <Order />
                    <Outlet>
                        <Item />
                    </Outlet>
                </Outlet>
            </Outlet>
        </main>
    );
}

function User() {
    const { prev } = useContext(RouterContext);
    return <p>User {prev}</p>;
}

function Order() {
    const { prev } = useContext(RouterContext);
    return <p>Order {prev}</p>;
}

function Item() {
    const { prev } = useContext(RouterContext);
    return <p>Item {prev}</p>;
}
