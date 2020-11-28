import React, { useCallback, useEffect } from 'react';
import { assign, DoneInvokeEvent, Machine } from 'xstate';
import { v4 as uuidv4 } from 'uuid';
import { useMachine, useService } from '@xstate/react';
import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { createBrowserHistory, History } from 'history';
import { matchPath } from 'react-router';

type Context = {
    location: History['location'];
    depth: number;
    parents: string[];
    seg: string;
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

// prettier-ignore
type Events =
    | { type: "xstate.init"; }
    | { type: "HISTORY_EVT"; location: History["location"] }

export type Resolver = (
    location: History['location'],
    depth: number,
) => Promise<ResolveResult>;

export type DataLoader = (resolve: ResolveData) => Promise<any>;

type ResolveResult = {
    component?: any;
    query: Record<string, any>;
    params: Record<string, any>;
    status?: number;
};
type ResolveData = {
    query: Record<string, any>;
    params: Record<string, any>;
};

const createRouterMachine = (
    id: string,
    parents: string[],
    seg: string,
    depth: number,
    location: History['location'],
    resolver?: Resolver,
    dataLoader?: DataLoader,
) =>
    Machine<Context, Record<string, any>, Events>(
        {
            id,
            initial: 'resolving',
            context: {
                location,
                depth: depth,
                seg,
                parents,
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
                HISTORY_EVT: [{ target: 'resolving', cond: 'matchedDepth' }],
            },
            states: {
                resolving: {
                    entry: ['assignResolveLoading'],
                    invoke: {
                        src: 'resolveComponent',
                        onDone: {
                            target: 'loadingData',
                            actions: ['assignResolveData'],
                        },
                    },
                },
                loadingData: {
                    entry: 'assignDataLoading',
                    invoke: {
                        src: 'loadData',
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
                    switch (evt.type) {
                        case 'HISTORY_EVT': {
                            const split = evt.location.pathname
                                .slice(1)
                                .split('/');
                            const joined =
                                '/' + ctx.parents.concat(ctx.seg).join('/');
                            const output = matchPath(
                                evt.location.pathname,
                                joined,
                            );
                            if (output && !output.isExact) {
                                return false;
                            }
                            if (output && output.isExact) {
                                return true;
                            }
                            return false;
                        }
                        default:
                            return false;
                    }
                },
            },
            services: {
                resolveComponent: async (ctx, evt) => {
                    if (!resolver) {
                        return null;
                    }
                    const subject = (() => {
                        switch (evt.type) {
                            case 'xstate.init':
                                return ctx.location;
                            case 'HISTORY_EVT':
                                return evt.location;
                        }
                    })();
                    const output = await resolver(subject, ctx.depth);
                    return output;
                },
                loadData: async (ctx, evt) => {
                    if (!dataLoader) {
                        return null;
                    }
                    const output = await dataLoader(ctx.resolveData.data);
                    return output;
                },
            },
            actions: {
                assignResolveData: assign({
                    component: (x, evt) => {
                        const e = evt as DoneInvokeEvent<ResolveResult>;
                        return e.data.component;
                    },
                    resolveData: (ctx, evt) => {
                        const e = evt as DoneInvokeEvent<ResolveResult>;
                        const { component, ...rest } = e.data;
                        return {
                            ...ctx.resolveData,
                            loading: false,
                            data: rest,
                        };
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
    parents: string[];
}>({
    send: null,
    service: null,
    prev: 0,
    parents: [],
});

type ProviderProps = {
    dataLoader?: DataLoader;
    resolver?: Resolver;
    fallback?: () => React.ReactNode;
    seg: string;
};
const noopDataLoader = () => Promise.resolve({});
const noopResolver = () => Promise.resolve({});
export function RouterProvider(props: PropsWithChildren<ProviderProps>) {
    const { dataLoader = noopDataLoader, resolver, seg } = props;
    const { history } = useContext(BaseRouterContext);
    const {
        send: parentSend,
        service: parentService,
        prev,
        parents,
    } = useContext(RouterContext);
    const currentDepth = parentSend === null ? 0 : prev + 1;
    const machine = useMemo(() => {
        return createRouterMachine(
            `router-${parents.concat(props.seg).join('/')}-${uuidv4().slice(
                0,
                6,
            )}`,
            parents,
            seg,
            currentDepth,
            history.location,
            resolver,
            dataLoader,
        );
    }, [
        currentDepth,
        dataLoader,
        history.location,
        parents,
        props.seg,
        resolver,
        seg,
    ]);
    // const resolverWrapped = useCallback(() => {
    //     return resolver();
    // }, [resolver]);
    const [state, send, service] = useMachine(machine, {
        devTools: true,
        parent: parentService,
    });

    useEffect(() => {
        const unlisten = history.listen(({ location, action }) => {
            send({ type: 'HISTORY_EVT', location });
        });
        return () => {
            unlisten();
        };
    }, [currentDepth, history, resolver, send, service]);

    const api = useMemo(() => {
        return {
            send,
            service,
            prev: currentDepth,
            parents: parents.concat(props.seg),
        };
    }, [send, service, currentDepth, parents, props.seg]);

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
