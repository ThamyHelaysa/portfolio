import * as React from 'react';
import styled from 'styled-components';

import { Wrapper } from '../DefaultWrapper';

const Container = styled.main`
  margin-top: -4px;
  margin-bottom: -4px;
  background-color: ${(props) => props.theme.colors.bgColor};
  border: ${(props) => props.theme.colors.border};
  transition: background-color, color 250ms ease;
  @media print {
    border: 0;
  }
`

const Main = ({ children }) => {
  return (
    <Container>
      <Wrapper>
        {children}
      </Wrapper>
    </Container>
  )
}

export default Main
