import * as React from 'react';
import styled from 'styled-components';

import NavigationWrapper from '../Navigation/Header';
import Main from '../Main/Content';
import { MaxWidthWrapper } from '../MaxWidthWrapper';
import Footer from '../Footer/Footer';

import { BlogTitleH1 } from '../Paragraphs/BlogTitle';
import { GlobalThemeProvider } from '../../hooks/useGlobalTheme';
import SubTitle from '../Paragraphs/SubTitle';
import TimeToRead from '../Paragraphs/TimeToRead';

import BREAKPOINTS from '../../constants/breakpoints';


const PageWrapper = styled.div`
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: .5rem 1rem;
  @media (max-width: ${BREAKPOINTS.mobile}){
    padding: 0px;
  }
`

const InfoContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0 10px;
  margin-bottom: 3rem;
`

const BlogLayout = ({ pageTitle, publishData, tableContents, contentBody, dataPhrases, children }) => {

  const [timeToRead, setTimeToRead] = React.useState(0);

  const initTime = React.useCallback(() => {
    let count = contentBody.match(/\w+/g).length;
    let time = Math.ceil(count / 250);
    setTimeToRead(time);
  },[contentBody])

  React.useEffect(() => {
    initTime();
  }, [timeToRead, initTime])
  
  return (
    <GlobalThemeProvider>
      <PageWrapper>
        <NavigationWrapper />
        <Main>
          <MaxWidthWrapper>
            <BlogTitleH1>{pageTitle}</BlogTitleH1>
            <InfoContainer>
              <SubTitle>{publishData}</SubTitle>
              •
              <TimeToRead>{timeToRead}</TimeToRead>
            </InfoContainer>
            {children}
          </MaxWidthWrapper>
        </Main>
        <Footer footerPhrases={dataPhrases}/>
      </PageWrapper>
    </GlobalThemeProvider>
  )
}

export default BlogLayout
