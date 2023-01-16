import * as React from 'react';
import styled from 'styled-components';

import { MaxWidthBorderedWrapper } from '../MaxWidthWrapper';

const Wrapper = styled.footer`
  line-height: 2;
  @media print {
    display: none;
  }
`

const Container = styled(MaxWidthBorderedWrapper)`
  padding: 3rem 1rem;
`

const Copyright = styled.p`
  padding: 5px 1rem;
`

const Link = styled.a`
  padding: 0 5px;
  color: inherit;
  font-weight: ${(props) => props.theme.fonts.paraGraphsBold.fontWeight};
  transition: all 250ms ease 0s;
  &:hover {
      background-color: ${(props) => props.theme.colors.extra};
      color: ${(props) => props.theme.colors.brightness};
  }
`

const Footer = () => {
  return (
    <Wrapper>
      <Container>
        <Copyright>
          This website was built with
          <Link href='https://www.gatsbyjs.com/' rel='noreferrer' target="_blank">Gatsby</Link>
          and hosted on
          <Link href='https://netlify.com/' rel='noreferrer' target="_blank">Netlify</Link>
        </Copyright>
        <Copyright>
          © Thamires Helaysa 2019 – Today.
          <strong> All rights reserved.</strong>
        </Copyright>
      </Container>
    </Wrapper>
    
  )
}

export default Footer;
