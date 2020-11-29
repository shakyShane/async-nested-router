import React, { useCallback, useEffect, useState } from 'react';
import { assign, DoneInvokeEvent, Interpreter, Machine, send } from 'xstate';
import { v4 as uuidv4 } from 'uuid';
import { useMachine, useService } from '@xstate/react';
import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { BrowserHistory, createBrowserHistory, History } from 'history';
import { matchPath } from 'react-router';
import debugpkg from 'debug';
import { pure } from 'xstate/lib/actions';
const debug = debugpkg('router');

type Context = {
    location: History['location'];
    depth: number;
    parents: Array<string>;
    segs: string[];
    current: string;
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

export type Resolver = (location: History['location'], depth: number) => Promise<ResolveResult>;

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
    parents: Array<string>,
    current: string,
    segs: string[],
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
                segs,
                current,
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
                    return true;
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
    parents: Array<string>;
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
    segs: string[];
    current: string;
};
const noopDataLoader = () => Promise.resolve({});
const noopResolver = () => Promise.resolve({});
export function RouterProvider(props: PropsWithChildren<ProviderProps>) {
    const { dataLoader = noopDataLoader, resolver, segs, current } = props;
    const { history, service: baseRouterService, send: baseRouterSend } = useContext(BaseRouterContext);
    const { send: parentSend, service: parentService, prev, parents } = useContext(RouterContext);
    const currentDepth = parentSend === null ? 0 : prev + 1;
    const machine = useMemo(() => {
        return createRouterMachine(
            `router-${current}-${uuidv4().slice(0, 6)}`,
            parents,
            current,
            segs,
            currentDepth,
            history.location,
            resolver,
            dataLoader,
        );
    }, [currentDepth, dataLoader, history.location, parents, resolver, segs, current]);

    const [state, send, service] = useMachine(machine, {
        devTools: true,
        parent: parentService,
    });

    useEffect(() => {
        const matchers: Matcher[] = [];
        segs.forEach((seg) => {
            const joined = '/' + parents.concat(seg).join('/');
            matchers.push({ depth: currentDepth, path: joined });
        });
        debug('sending matchers %o', matchers);
        baseRouterSend({ type: 'REGISTER', matchers });
        const listenBase = baseRouterService.subscribe((x: any) => {
            if (x.event.type === '@external.TRIGGER_RESOLVE') {
                if (x.event.depth === currentDepth) {
                    send({ type: 'HISTORY_EVT', location: x.event.location });
                }
            }
        });

        return () => {
            baseRouterSend({ type: 'UNREGISTER', depth: currentDepth });
            return listenBase.unsubscribe();
        };
    }, [baseRouterSend, baseRouterService, currentDepth, parents, segs, send]);

    const api = useMemo(() => {
        return {
            send,
            service,
            prev: currentDepth,
            parents: parents.concat(props.current),
        };
    }, [send, service, currentDepth, parents, props]);

    return (
        <RouterContext.Provider value={api}>
            <pre>
                <code>value: {state.value}</code>
            </pre>
            {state.context.component ? React.createElement(state.context.component) : null}
            {props.children}
        </RouterContext.Provider>
    );
}

type RouterProps = {
    resolver: () => Promise<any>;
    dataLoader: () => Promise<any>;
};

const bh = createBrowserHistory();
const BaseRouterContext = createContext<{
    history: BrowserHistory;
    send: Interpreter<any, any, BaseEvt>['send'];
    service: any;
}>({
    send: null as any,
    service: null,
    history: bh,
});

type BaseContext = {
    matchers: Matcher[];
};

//prettier-ignore
type BaseEvt =
    | { type: '@external.TRIGGER_RESOLVE'; depth: number; exact: boolean; location: History['location']; action: History['action'] }
    | { type: 'REGISTER'; matchers: Matcher[] }
    | { type: 'UNREGISTER'; depth: number }
    | { type: 'HISTORY_EVT'; location: History['location']; action: History['action'] };

const baseMachine = Machine<BaseContext, Record<string, any>, BaseEvt>(
    {
        id: 'base-router',
        initial: 'idle',
        context: {
            matchers: [],
        },
        states: {
            idle: {},
        },
        on: {
            HISTORY_EVT: { actions: 'notifyRouters' },
            REGISTER: { actions: 'assignMatchers' },
            UNREGISTER: { actions: 'removeMatchers' },
        },
    },
    {
        actions: {
            assignMatchers: assign({
                matchers: (ctx, evt) => {
                    switch (evt.type) {
                        case 'REGISTER':
                            return ctx.matchers.concat(evt.matchers);
                        default:
                            return ctx.matchers;
                    }
                },
            }),
            removeMatchers: assign({
                matchers: (ctx, evt) => {
                    switch (evt.type) {
                        case 'UNREGISTER':
                            return ctx.matchers.filter((ctxM) => ctxM.depth !== evt.depth);
                        default:
                            return ctx.matchers;
                    }
                },
            }),
            notifyRouters: pure((ctx, evt) => {
                switch (evt.type) {
                    case 'HISTORY_EVT': {
                        const location = evt.location;
                        const action = evt.action;
                        const depthFirstsorted = ctx.matchers.slice().sort((a, b) => b.depth - a.depth);
                        const exactMatch = select({
                            inputs: depthFirstsorted,
                            pathname: location.pathname,
                            exact: true,
                        });

                        if (exactMatch) {
                            return send({
                                type: '@external.TRIGGER_RESOLVE',
                                depth: exactMatch.depth,
                                exact: true,
                                location,
                                action,
                            });
                        }

                        const noneExact = select({
                            inputs: depthFirstsorted,
                            pathname: location.pathname,
                            exact: false,
                        });

                        if (noneExact) {
                            return send({
                                type: '@external.TRIGGER_RESOLVE',
                                depth: noneExact.depth,
                                exact: false,
                                location,
                                action,
                            });
                        }

                        console.warn('no matching route found');
                    }
                }
                return undefined;
            }),
        },
    },
);

export function BaseRouter(props: PropsWithChildren<any>) {
    const [state, send, service] = useMachine(baseMachine, { devTools: true });
    useEffect(() => {
        const unlisten = bh.listen(({ location, action }) => {
            send({ type: 'HISTORY_EVT', location, action });
        });
        return () => {
            unlisten();
        };
    }, []);
    const api = useMemo(() => {
        return { history: bh, send, service };
    }, [send, service]);
    return <BaseRouterContext.Provider value={api}>{props.children}</BaseRouterContext.Provider>;
}

export function Outlet() {
    const { service, prev } = useContext(RouterContext);
    return <p>Outlet at depth: {prev}</p>;
}

export function useRouteData() {
    const { service } = useContext(RouterContext);
    const [state] = useService(service);
    return (state as any).context.routeData;
}

export function useResolveData() {
    const { service } = useContext(RouterContext);
    const [state] = useService(service);
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

interface Matcher {
    path: string;
    depth: number;
}

interface SelectParams {
    inputs: Matcher[];
    pathname: string;
    exact: boolean;
}

export function select(inputs: SelectParams) {
    return inputs.inputs.find((m) => matchPath(inputs.pathname, { path: m.path, exact: inputs.exact }));
}
