import React, { useEffect } from 'react';
import { assign, Machine } from 'xstate';
import { v4 as uuidv4 } from 'uuid';
import { useMachine } from '@xstate/react';
import { createContext, PropsWithChildren, useContext, useMemo } from 'react';

const m = (id: string) =>
    Machine(
        {
            id,
            initial: 'resolving',
            on: { TICK: { actions: 'tick' } },
            context: {
                count: 0,
            },
            states: {
                resolving: {
                    on: {
                        RESOLVED: 'resolved',
                    },
                },
                resolved: {},
            },
        },
        {
            actions: {
                tick: assign({ count: (ctx) => ctx.count + 1 }),
            },
        },
    );

export const RouterContext = createContext<{
    send: any;
    service: any;
    prev: number;
}>({
    send: null,
    service: null,
    prev: 0,
});

export function RouterProvider(props: PropsWithChildren<any>) {
    const { send: parentSend, service: parentService, prev } = useContext(
        RouterContext,
    );
    const currentDepth = prev;
    const machine = useMemo(
        () => m(`router-${currentDepth}-${uuidv4().slice(0, 6)}`),
        [],
    );
    const [state, send, service] = useMachine(machine, {
        devTools: true,
        parent: parentService,
    });
    const api = useMemo(() => {
        return { send, service, prev: prev + 1 };
    }, [send, service, prev]);
    useEffect(() => {
        setInterval(() => {
            send('TICK');
        }, 1000);
    }, [send, parentSend]);
    return (
        <RouterContext.Provider value={api}>
            {props.children}
        </RouterContext.Provider>
    );
}

export function Outlet(props: PropsWithChildren<any>) {
    return (
        <RouterProvider>
            <div style={{ padding: '20px', border: '1px dotted red' }}>
                {props.children}
            </div>
        </RouterProvider>
    );
}
