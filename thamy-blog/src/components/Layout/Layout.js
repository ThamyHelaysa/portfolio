import * as React from 'react';
import styled from 'styled-components';

import NavigationWrapper from '../Navigation/Header';
import Main from '../Main/Content';
import Footer from '../Footer/Footer';


const PageWrapper = styled.div`
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
  padding: .5rem 1rem;
`

const PageTitleH1 = styled.h1`
  margin-top: 2rem;
  color: ${(props) => props.theme.colors.primary};
  font-size: 5rem;
  line-height: 1;
`

const PageSubtitle = styled.div`
  color: ${(props) => props.theme.colors.secondary};
  font-family: 'Courier New', Courier, monospace;
  font-weight: bold;
`

const Layout = ({ pageTitle, pageSub, children }) => {
  return (
    <PageWrapper>
      <NavigationWrapper />
      <Main>
          <PageTitleH1>{pageTitle}</PageTitleH1>
          <PageSubtitle role="doc-subtitle">{pageSub}</PageSubtitle>
          {children}
      </Main>
      <Footer />
    </PageWrapper>
  )
}

export default Layout
