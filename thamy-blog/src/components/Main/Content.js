import * as React from 'react';
import styled from 'styled-components';

import { MaxWidthBorderedWrapper } from '../MaxWidthWrapper';

const Wrapper = styled.main`
  margin-top: -2px;
  margin-bottom: -2px;
`

const Main = ({ children }) => {
  return (
    <Wrapper>
      <MaxWidthBorderedWrapper>
        {children}
      </MaxWidthBorderedWrapper>
    </Wrapper>
  )
}

export default Main
