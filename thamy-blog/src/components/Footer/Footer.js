import * as React from 'react';
import styled from 'styled-components';

import BREAKPOINTS from '../../constants/breakpoints';
import FONTS from '../../constants/fonts';

import { BorderedWrapper } from '../DefaultWrapper';
import ContactList from '../Listing/ContactList';
import Phrases from '../Listing/Phrases';

const Wrapper = styled.footer`
  line-height: 2;
  @media print {
    display: none;
  }
  @media (max-width: ${BREAKPOINTS.tablet}){
    line-height: inherit;
  }
`

const Container = styled(BorderedWrapper)`
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: 1fr auto auto 1fr;
  gap: 0 1rem;
  padding: 3rem 4rem;
  & > .--phrases-box {
    grid-column: 2/3;
    grid-row: span 4;
    max-width: clamp(300px, 40%,  300px);
    margin-top: 0;
    margin-right: 0;
    margin-bottom: 0;
    padding: 0 0 0 1rem;
    background-color: transparent;
    border-left: ${(props) => props.theme.colors.border};
    text-align: right;
    & > .--translate {
      margin-top: -.75rem;
    }
  }
  @media (max-width: ${BREAKPOINTS.tablet}){
    display: flex;
    flex-flow: column;
    padding: 2rem 1rem;
    & > .--phrases-box {
      max-width: 100%;
      margin: 2rem 0;
      padding: 1rem 1rem 2rem;
      text-align: left;
      line-height: 2;
      border-left: 0;
      border-bottom: ${(props) => props.theme.colors.border};
    }
  }
`

const Copyright = styled.p`
  padding: 5px 1rem;
`

const Link = styled.a`
  padding: 0 5px;
  color: inherit;
  font-weight: ${FONTS.paraGraphsBold.fontWeight};
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
        <ContactList className="--on-footer"></ContactList>
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
