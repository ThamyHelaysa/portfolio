import * as React from 'react';
import styled from 'styled-components';

import NavigationWrapper from '../Navigation/Header';
import Main from '../Main/Content';
import Footer from '../Footer/Footer';

import { TitleH1 } from '../Paragraphs/PageTitle';
import SubTitle from '../Paragraphs/SubTitle';
import { Paragraph } from '../Paragraphs/Paragraph';
import { GlobalThemeProvider } from '../../hooks/useGlobalTheme';

import BREAKPOINTS from '../../constants/breakpoints';


const PageWrapper = styled.div`
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: .5rem 1rem;
  @media (max-width: ${BREAKPOINTS.mobile}){
    padding: 0px;
  }
`

const PageTitleH1 = styled(TitleH1)`
  margin-top: 2rem;
  @media print {
    margin-top: 1rem;
    /* font-size: 5rem!important; */
  }
`

const Layout = ({ pageTitle, pageSub, introText, children }) => {
  return (
    <GlobalThemeProvider>
      <PageWrapper>
        <NavigationWrapper />
        <Main>
            <PageTitleH1>{pageTitle}</PageTitleH1>
            <SubTitle role="doc-subtitle">{pageSub}</SubTitle>
            <Paragraph>
              {introText}
            </Paragraph>
            {children}
        </Main>
        <Footer />
      </PageWrapper>
    </GlobalThemeProvider>
  )
}

export default Layout
