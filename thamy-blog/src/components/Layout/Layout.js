import * as React from 'react';
import styled from 'styled-components';

import NavigationWrapper from '../Navigation/Header';
import Main from '../Main/Content';
import Footer from '../Footer/Footer';
import { TitleH1 } from '../Paragraphs/PageTitle';
import { Paragraph } from '../Paragraphs/Paragraph';
import { GlobalThemeProvider } from '../../hooks/useGlobalTheme';


const PageWrapper = styled.div`
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: .5rem 1rem;
`

const PageTitleH1 = styled(TitleH1)`
  margin-top: 2rem;
`

const PageSubtitle = styled.div`
  color: ${(props) => props.theme.colors.secondary};
  font-family: ${(props) => props.theme.fonts.subTitle.fontFamily};
  font-weight: ${(props) => props.theme.fonts.subTitle.fontWeight};
`

const Layout = ({ pageTitle, pageSub, children }) => {
  return (
    <GlobalThemeProvider>
      <PageWrapper>
        <NavigationWrapper />
        <Main>
            <PageTitleH1>{pageTitle}</PageTitleH1>
            <PageSubtitle role="doc-subtitle">{pageSub}</PageSubtitle>
            <Paragraph>
              {children}
            </Paragraph>
        </Main>
        <Footer />
      </PageWrapper>
    </GlobalThemeProvider>
  )
}

export default Layout
