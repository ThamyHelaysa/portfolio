import * as React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 1300px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 2rem;
  padding-right: 2rem;
  z-index: 1;
`

const BorderedContainer = styled(Container)`
  background-color: ${(props) => props.theme.colors.secondary};
  border: ${(props) => props.theme.colors.border};
`

const MaxWidthWrapper = ({children}) => {
  return (
    <Container>
      {children}
    </Container>
  )
}

const MaxWidthBorderedWrapper = ({children}) => {
  return (
    <BorderedContainer>
      {children}
    </BorderedContainer>
  )
}

export { MaxWidthWrapper, MaxWidthBorderedWrapper }