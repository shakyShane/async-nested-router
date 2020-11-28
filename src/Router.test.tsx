import * as React from 'react';
import { expect } from 'chai';
import { guard } from './Router';

describe('<Router>', () => {
    it('depth: 2 id segment', () => {
        const pathname = '/user/orders/12';
        const segs = [':id'];
        const parents = ['user', 'orders'];
        const actual = guard(pathname, 2, segs, parents);
        expect(actual).eq(true);
    });
    it('depth: 1 -> user/orders/12', () => {
        const pathname = '/user/orders/12';
        const segs = ['orders', 'dashboard'];
        const parents = ['user'];
        const actual = guard(pathname, 1, segs, parents);
        expect(actual).eq(false);
    });
    it('depth: 1, different', () => {
        const pathname = '/user/dashboard';
        const segs = [':id'];
        const parents = ['user', 'orders'];
        const actual = guard(pathname, 0, segs, parents);
        expect(actual).eq(false);
    });
});
