import * as React from 'react';
import styled from 'styled-components';

import { BorderedWrapper } from '../DefaultWrapper';

import OpenNavButton from '../Button/OpenCloseNav'
import SwapTheme from '../Button/ChangeTheme';
import NavigationList from './List'
import MobileNav from './MobileNav';

const Nav = styled.nav`
  position: sticky;
  top: 0;
  left: 0;
  font-size: 1rem;
  z-index: 9;

  @media print {
    display: none;
  }

  & > .--container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    padding-bottom: 1rem;
  }

`

const NavigationWrapper = () => {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const openList = React.useCallback(() => {
    setIsMobileOpen(!isMobileOpen);
  }, [isMobileOpen]);

  return (
    <Nav>
      <BorderedWrapper className='--container'>
        <NavigationList />
        <OpenNavButton isOpenNav={isMobileOpen} onClick={openList} />
        <MobileNav isOpen={isMobileOpen} />
        <SwapTheme className="--inside-header" />
      </BorderedWrapper>
    </Nav>
  )
}

export default NavigationWrapper
