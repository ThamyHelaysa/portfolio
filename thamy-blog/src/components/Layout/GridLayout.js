import * as React from 'react';
import styled from 'styled-components';

import NavigationWrapper from '../Navigation/Header';
import Main from '../Main/Content';
import Footer from '../Footer/Footer';
import PageTitle from '../Paragraphs/PageTitle';
import { StyledParagraph } from '../Paragraphs/Paragraph';


const PageWrapper = styled.div`
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
  padding: .5rem 1rem;
`

const PageTitleH1 = styled(PageTitle)`
  &.--medium {
    font-size: 4rem;
  }
`

const PageTitleH1Vertical = styled(PageTitle)`
  font-size: 8rem;
  grid-row: span 2;
  -webkit-writing-mode: vertical-rl;
  -ms-writing-mode: tb-rl;
  writing-mode: vertical-rl;
  -webkit-transform: rotate(180deg);
  text-align: end;
  transform: rotate(180deg);

`

const PageSubtitle = styled.div`
  position: absolute;
  grid-column: 2/3;
  grid-row: 2/3;
  top: -1rem;
  left: 0;
  color: ${(props) => props.theme.colors.secondary};
  font-family: ${(props) => props.theme.fonts.subTitle.fontFamily};
  font-weight: ${(props) => props.theme.fonts.subTitle.fontWeight};
`

const Container = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: auto 2fr 1fr;
  grid-template-rows: auto 1fr;
  gap: 1rem;
`

const Paragraph = styled(StyledParagraph)`
  grid-column: 2/3;
  grid-row: 2/3;
`

const Layout = ({ pageTitle, pageSub, children }) => {
  return (
    <PageWrapper>
      <NavigationWrapper />
      <Main>
          <Container>
            <PageTitleH1Vertical>Hello!</PageTitleH1Vertical>
            <PageTitleH1>{pageTitle}</PageTitleH1>
            <PageSubtitle role="doc-subtitle">{pageSub}</PageSubtitle>
            <Paragraph>
              {children}
            </Paragraph>
          </Container>
      </Main>
      <Footer />
    </PageWrapper>
  )
}

export default Layout
