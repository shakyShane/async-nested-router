import React, { useCallback, useEffect, useState } from 'react';
import { assign, Machine, send } from 'xstate';
import { v4 as uuidv4 } from 'uuid';
import { useMachine, useService } from '@xstate/react';
import { createContext, PropsWithChildren, useContext, useMemo } from 'react';

type Context = {
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

export type Resolver = (pathname: string) => Promise<ResolveResult>;
type ResolveResult = {
    component: any;
    query: Record<string, any>;
    params: Record<string, any>;
};
type ResolveData = {
    query: Record<string, any>;
    params: Record<string, any>;
};

const m = (id: string) =>
    Machine<Context>(
        {
            id,
            initial: 'resolving',
            context: {
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
            states: {
                resolving: {
                    entry: ['assignResolveLoading', 'triggerResolve'],
                    on: {
                        RESOLVED: {
                            target: 'loadingData',
                            actions: 'assignResolveData',
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
            actions: {
                triggerResolve: send('TRIGGER_RESOLVE'),
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
    const { send: parentSend, service: parentService, prev } = useContext(
        RouterContext,
    );
    const currentDepth = parentSend === null ? 0 : prev + 1;
    const machine = useMemo(
        () => m(`router-${currentDepth}-${uuidv4().slice(0, 6)}`),
        [currentDepth],
    );
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
    const [localCmp, setCmp] = useState(false);
    useEffect(() => {
        const sub = service.subscribe((x) => {
            if (x.event.type === 'TRIGGER_RESOLVE') {
                setCmp(true);
            }
        });
        return () => sub.unsubscribe();
    }, [resolver, service]);
    const api = useMemo(() => {
        return { send, service, prev: currentDepth };
    }, [send, service, currentDepth]);
    const MaybeLazyComponent: any = useMemo(() => {
        if (resolver && localCmp) {
            return React.lazy(() =>
                resolver('/users/orders/12').then((x: any) => {
                    const { component, ...rest } = x;
                    send('RESOLVED', { data: rest });
                    return x.component;
                }),
            );
        }
        return null;
    }, [localCmp, send, resolver]);
    return (
        <RouterContext.Provider value={api}>
            {resolver && localCmp && (
                <React.Suspense
                    fallback={(props.fallback && props.fallback()) || '...'}
                >
                    <MaybeLazyComponent />
                </React.Suspense>
            )}
            {props.children}
        </RouterContext.Provider>
    );
}

type RouterProps = {
    resolver: () => Promise<any>;
    dataLoader: () => Promise<any>;
};

export function Router(props: PropsWithChildren<RouterProps>) {
    return (
        <RouterProvider dataLoader={props.dataLoader} resolver={props.resolver}>
            <div style={{ padding: '20px', border: '1px dotted red' }}>
                {props.children}
            </div>
        </RouterProvider>
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
    return <a href={props.to}>{props.children}</a>;
}
