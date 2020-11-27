import React, { useCallback, useEffect, useState } from 'react';
import { assign, Machine, send } from 'xstate';
import { v4 as uuidv4 } from 'uuid';
import { useMachine, useService } from '@xstate/react';
import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { createBrowserHistory, History } from 'history';

type Context = {
    location: History['location'];
    depth: number;
    component: null | any;
    resolveData: {
        loading: boolean;
        data: ResolveData;
        error: string | null;
    };
    routeData: {
        loading: boolean;
        data: any;
        error: string | null;
    };
};

export type Resolver = (
    location: History['location'],
) => Promise<ResolveResult>;
type ResolveResult = {
    component: any;
    query: Record<string, any>;
    params: Record<string, any>;
};
type ResolveData = {
    query: Record<string, any>;
    params: Record<string, any>;
};

const createRouterMachine = (
    id: string,
    depth: number,
    location: History['location'],
    resolver?: Resolver,
) =>
    Machine<Context>(
        {
            id,
            initial: 'resolving',
            context: {
                location,
                depth: depth,
                component: null,
                resolveData: {
                    loading: false,
                    data: {
                        query: {},
                        params: {},
                    },
                    error: null,
                },
                routeData: {
                    loading: false,
                    data: undefined,
                    error: null,
                },
            },
            on: {
                HISTORY_EVT: [{ target: 'loadingData', cond: 'matchedDepth' }],
            },
            states: {
                resolving: {
                    entry: ['assignResolveLoading'],
                    invoke: {
                        src: 'resolveComponent',
                        onDone: {
                            target: 'loadingData',
                            actions: [
                                'assignResolveData',
                                'assignResolvedComponent',
                            ],
                        },
                    },
                },
                loadingData: {
                    entry: 'assignDataLoading',
                    invoke: {
                        src: 'dataLoader',
                        onDone: {
                            target: 'dataLoaded',
                            actions: 'assignRouteData',
                        },
                    },
                },
                dataLoaded: {},
            },
        },
        {
            guards: {
                matchedDepth: (ctx, evt) => {
                    return true;
                },
            },
            services: {
                resolveComponent: async (ctx, evt) => {
                    if (!resolver) {
                        return null;
                    }
                    const output = await resolver(ctx.location);
                    return output;
                },
            },
            actions: {
                assignResolvedComponent: assign({
                    component: (x, evt) => {
                        return evt.data.component;
                    },
                }),
                assignResolveLoading: assign({
                    resolveData: (ctx) => {
                        return {
                            ...ctx.resolveData,
                            loading: true,
                        };
                    },
                }),
                assignResolveData: assign({
                    resolveData: (ctx, evt) => {
                        return {
                            ...ctx.resolveData,
                            loading: false,
                            data: (evt as any).data,
                        };
                    },
                }),
                assignDataLoading: assign({
                    routeData: (ctx) => {
                        return {
                            ...ctx.routeData,
                            loading: true,
                        };
                    },
                }),
                assignRouteData: assign({
                    routeData: (ctx, evt) => {
                        return {
                            ...ctx.routeData,
                            loading: false,
                            data: (evt as any).data,
                        };
                    },
                }),
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

type ProviderProps = {
    dataLoader?: () => Promise<any>;
    resolver?: Resolver;
    fallback?: () => React.ReactNode;
};
const noopDataLoader = () => Promise.resolve({});
const noopResolver = () => Promise.resolve({});
export function RouterProvider(props: PropsWithChildren<ProviderProps>) {
    const { dataLoader = noopDataLoader, resolver } = props;
    const { history } = useContext(BaseRouterContext);
    const { send: parentSend, service: parentService, prev } = useContext(
        RouterContext,
    );
    const currentDepth = parentSend === null ? 0 : prev + 1;
    const machine = useMemo(() => {
        return createRouterMachine(
            `router-${currentDepth}-${uuidv4().slice(0, 6)}`,
            currentDepth,
            history.location,
            resolver,
        );
    }, [currentDepth, history.location, resolver]);
    const dataLoaderWrapped = useCallback(
        (ctx, evt) => {
            return dataLoader();
        },
        [dataLoader],
    );
    // const resolverWrapped = useCallback(() => {
    //     return resolver();
    // }, [resolver]);
    const [state, send, service] = useMachine(machine, {
        devTools: true,
        parent: parentService,
        actions: {},
        services: {
            dataLoader: dataLoaderWrapped,
        },
    });

    useEffect(() => {
        let prev = history.location.pathname;
        const unlisten = history.listen(({ location, action }) => {
            const segs1 = prev.slice(1).split('/');
            const segs2 = location.pathname.slice(1).split('/');
            for (let i = 0; i <= currentDepth; i++) {
                if (segs1[i] !== segs2[i]) {
                    if (i === currentDepth) {
                        send({ type: 'HISTORY_EVT' });
                    }
                }
            }
            prev = location.pathname;
        });
        return () => {
            unlisten();
        };
    }, [currentDepth, history, resolver, send, service]);

    const api = useMemo(() => {
        return { send, service, prev: currentDepth };
    }, [send, service, currentDepth]);

    // /**
    //  *
    //  */
    // const MaybeLazyComponent: any = useMemo(() => {
    //     if (resolver && pathname) {
    //         console.log('resolving...');
    //         return React.lazy(() =>
    //             resolver(pathname).then((x: any) => {
    //                 const { component, ...rest } = x;
    //                 send('RESOLVED', { data: rest });
    //                 return x.component;
    //             }),
    //         );
    //     }
    //     return null;
    // }, [pathname, send, resolver]);
    return (
        <RouterContext.Provider value={api}>
            <pre>
                <code>value: {state.value}</code>
            </pre>
            {state.context.component
                ? React.createElement(state.context.component)
                : null}
            {props.children}
        </RouterContext.Provider>
    );
}

type RouterProps = {
    resolver: () => Promise<any>;
    dataLoader: () => Promise<any>;
};

const bh = createBrowserHistory();
const BaseRouterContext = createContext<{ history: History }>({
    history: bh,
});
export function BaseRouter(props: PropsWithChildren<any>) {
    const api = useMemo(() => {
        return { history: bh };
    }, []);
    return (
        <BaseRouterContext.Provider value={api as any}>
            {props.children}
        </BaseRouterContext.Provider>
    );
}

export function Outlet() {
    const { service, prev } = useContext(RouterContext);
    return <p>Outlet at depth: {prev}</p>;
}

export function useRouteData() {
    const { service } = useContext(RouterContext);
    const [state] = useService(service);
    // console.log(state);
    return (state as any).context.routeData;
}

export function useResolveData() {
    const { service } = useContext(RouterContext);
    const [state] = useService(service);
    // console.log(state);
    return (state as any).context.resolveData;
}

export function Link(props: PropsWithChildren<any>) {
    const { history } = useContext(BaseRouterContext);
    const onClick = useCallback(
        (evt) => {
            evt.preventDefault();
            history.push(evt.target.pathname);
        },
        [history],
    );
    return (
        <a href={props.to} onClick={onClick}>
            {props.children}
        </a>
    );
}
