import * as React from 'react';
import { Link } from 'gatsby';

const Navigation = () => {
    return (
        <nav>
            <ul>
                <li>
                    <span>{'// portfolio'}</span>
                    <Link to="/">Home</Link>
                </li>
                <li>
                    <span>{'// cv'}</span>
                    <Link to="/cv">curriculum vitæ</Link>
                </li>
                <li>
                    <span>{'// github'}</span>
                    <a
                        href="https://github.com/ThamyHelaysa"
                        target="_blank"
                        rel="noreferrer">https://github.com/ThamyHelaysa</a>
                </li>
                <li>
                    <span>{'// location'}</span>
                    <a
                        href="https://pt.wikipedia.org/wiki/Mar%C3%ADlia"
                        target="_blank"
                        rel="noreferrer">Marília, Brazil</a>
                </li>
            </ul>
        </nav>
    )
}

export default Navigation