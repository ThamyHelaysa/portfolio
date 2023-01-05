import * as React from 'react';
import styled from 'styled-components';

import { MaxWidthBorderedWrapper } from '../MaxWidthWrapper';

const Wrapper = styled.footer`
  text-align: center;
`

const Copyright = styled.p`
  padding: 1rem;
`

const Footer = () => {
  return (
    <Wrapper>
      <MaxWidthBorderedWrapper>
        <Copyright>Made with &#x1F5A4; and tons of &#x2615; by me.</Copyright>
      </MaxWidthBorderedWrapper>
    </Wrapper>
    
  )
}

export default Footer;
