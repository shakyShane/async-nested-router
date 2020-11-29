import React from 'react';
import { Link, useRouteData } from './Router';
export function Home() {
    const { loading, error, data } = useRouteData();
    return (
        <div>
            <h1>Homepage loading</h1>
            <p>
                Loading: <code>{String(loading)}</code>
            </p>
            <ul>
                <li>
                    <Link to={'/user'}>user</Link>
                </li>
            </ul>
        </div>
    );
}

export default Home;
