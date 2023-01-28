import * as React from 'react';
import styled from 'styled-components';

import BREAKPOINTS from '../../constants/breakpoints';

import { BorderedWrapper } from '../DefaultWrapper';
import Phrases from '../Listing/Phrases';

const Wrapper = styled.footer`
  line-height: 2;
  @media print {
    display: none;
  }
`

const Container = styled(BorderedWrapper)`
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: 1fr auto auto 1fr;
  padding: 3rem 4rem;
  @media (max-width: ${BREAKPOINTS.tablet}){
    padding: 2rem 1rem;
  }
  & > .--phrases-box {
    grid-column: 2/3;
    grid-row: span 4;
    margin-top: 0;
    margin-bottom: 0;
    padding: 0;
    background-color: transparent;
    text-align: right;
    & > .--translate {
      margin-top: -.75rem;
    }
  }
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

const Footer = ({footerPhrases}) => {
  return (
    <Wrapper>
      <Container>
        <Phrases className="--phrases-box" dataPhrases={footerPhrases}></Phrases>
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
