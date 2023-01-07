import * as React from 'react';
import styled from 'styled-components';

import { MaxWidthBorderedWrapper } from '../MaxWidthWrapper';
import NavigationList from './List'

const Nav = styled.nav`
  position: sticky;
  top: .5rem;
  left: 0;
  z-index: 9;
`

const NavigationWrapper = () => {
  return (
    <Nav>
      <MaxWidthBorderedWrapper>
        <NavigationList />
      </MaxWidthBorderedWrapper>
    </Nav>
  )
}

export default NavigationWrapper
