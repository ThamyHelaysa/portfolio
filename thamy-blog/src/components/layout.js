import * as React from 'react';

import Navigation from './navbar';
import Footer from './footer';

const Layout = ({ pageTitle, children}) => {
    return (
        <div>
            <Navigation></Navigation>
            <main>
                <h1>{pageTitle}</h1>
                <div role="doc-subtitle">Front-end developer</div>
                {children}
            </main>
            <Footer></Footer>
        </div>
    )
}

export default Layout
