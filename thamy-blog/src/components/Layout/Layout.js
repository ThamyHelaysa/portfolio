import * as React from 'react';
import styled from 'styled-components';

import NavigationWrapper from '../Navigation/Header';
import Main from '../Main/Content';
import Footer from '../Footer/Footer';
import { Paragraph } from '../Paragraphs/Paragraph';


const PageWrapper = styled.div`
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
  padding: .5rem 1rem;
`

const PageTitleH1 = styled.h1`
  margin-top: 2rem;
  font-family: ${(props) => props.theme.fonts.bigTitle.fontFamily};
  font-size: ${(props) => props.theme.fonts.bigTitle.fontSize};
  font-weight: ${(props) => props.theme.fonts.bigTitle.fontWeight};
  color: ${(props) => props.theme.colors.primary};
  line-height: 1;
`

const PageSubtitle = styled.div`
  color: ${(props) => props.theme.colors.secondary};
  font-family: ${(props) => props.theme.fonts.subTitle.fontFamily};
  font-weight: ${(props) => props.theme.fonts.subTitle.fontWeight};
`

const Layout = ({ pageTitle, pageSub, children }) => {
  return (
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
  )
}

export default Layout
