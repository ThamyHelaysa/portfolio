import * as React from 'react';
import styled from 'styled-components';

import CardsList from '../Navigation/Cards';
import { TitleH2 } from '../Paragraphs/PageTitle';

const LastPublishedContainer = styled.div`
  display: flex;
  flex-flow: row wrap;
  gap: 2rem 0;
  margin: 5rem 0;
  & > * {
    flex: 0 0 100%;
  }
  & > .--phrases {
    position: relative;
    flex: 1 1 auto;
    width: 100%;
    margin-bottom: 5rem;
    &::after {
      position: absolute;
      display: block;
      content: '';
      top: 50%;
      left: 50%;
      width: calc(100vw - 2rem);
      height: calc(100% + 4rem);
      background: ${(props) => props.theme.colors.emphaticPProjectBg};
      background-color: ${(props) => props.theme.colors.emphaticPProjectBorder};
      border: ${(props) => props.theme.colors.border};
      box-shadow: inset 0 0 0 10px ${(props) => props.theme.colors.emphaticPProjectBorder};
      transform: translate(-50%, -50%);
      z-index: -1;
    }
  }
`

const PublishedTitle = styled(TitleH2)`
  display: inline-block;
  margin-bottom: 3rem;
  color: ${(props) => props.theme.colors.emphaticPProjectColor};
  background-color: ${(props) => props.theme.colors.emphaticPProject};
`

const LastPublished = ({ blogPosts, children }) => {
  return (
    <LastPublishedContainer>
      {children}
      <PublishedTitle>Recently Published</PublishedTitle>
      <CardsList lastPublished={true} dataList={blogPosts}></CardsList>
    </LastPublishedContainer>
  )
}

export default LastPublished;
