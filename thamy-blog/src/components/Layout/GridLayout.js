import * as React from 'react';
import styled from 'styled-components';
import { StaticImage } from "gatsby-plugin-image"

import BREAKPOINTS from '../../constants/breakpoints';

import NavigationWrapper from '../Navigation/Header';
import Main from '../Main/Content';
import Footer from '../Footer/Footer';

import { TitleH1, TitleH2 } from '../Paragraphs/PageTitle';
import { StyledParagraph } from '../Paragraphs/Paragraph';


const PageWrapper = styled.div`
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: .5rem 1rem;
`

const PageTitleH1 = styled(TitleH1)`
  &.--big-font {
    font-size: 16vmin;
  }
  &.--medium-font {
    font-size: 8vmin;
    @media (max-width: ${BREAKPOINTS.tablet}){
      margin-top: 0;
    }
  }
  &.--vertical {
    writing-mode: vertical-rl;
    text-align: end;
    transform: rotate(180deg);
    @media (max-width: ${BREAKPOINTS.tablet}){
      text-align: left;
      writing-mode: lr;
      transform: none;
    }
  }
`

const PageTitleH2 = styled(TitleH2)`
  display: flex;
  align-items: center;
  font-size: 3rem;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  @media (max-width: ${BREAKPOINTS.tablet}){
    writing-mode: lr;
    transform: none;
  }
`

const PageSubtitle = styled.div`
  position: absolute;
  grid-column: 2/3;
  grid-row: 2/3;
  top: -1rem;
  left: 0;
  color: ${(props) => props.theme.colors.text};
  font-family: ${(props) => props.theme.fonts.subTitle.fontFamily};
  font-weight: ${(props) => props.theme.fonts.subTitle.fontWeight};
`

const Paragraph = styled(StyledParagraph)`
  grid-column: 2/3;
  grid-row: 2/3;
  padding-bottom: 0;
  line-height: 2;
  @media (max-width: ${BREAKPOINTS.laptop}){
    grid-column: 2/span 2;
  }
`

const Container = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: auto 2fr 1fr;
  grid-template-rows: auto 1fr;
  gap: 2rem 1rem;
  padding: 2rem 0;

  @media (max-width: ${BREAKPOINTS.tablet}){
    display: flex;
    flex-flow: column;
  }

  &::after {
    content: "";
    grid-column: span 3;
    grid-row: 3/4;
    height: 6rem;
  }

  & > .--vertical {
    grid-row: span 2;
  }
  & > .--two-columns {
    grid-column: span 3;
    padding-right: 2rem;
  }
  & > .--image-me {
    grid-row: span 2;
    border: 1rem solid ${(props) => props.theme.colors.extra};
    @media (max-width: ${BREAKPOINTS.laptop}){
      display: none;
    }
  }
  

`

const ContainerTwoColumns = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 1rem;
  padding: 2.5rem 0;
  border-top: 2px solid ${(props) => props.theme.colors.text};

  & > .--small-t  {
    width: 16vmin;
    max-height: 150px;
  }

  @media (max-width: ${BREAKPOINTS.tablet}){
    grid-template-columns: auto;
    gap: 2rem;
  }

`

const ItensList = styled.ul`
  display: flex;
  flex-flow: column;
  gap: 2rem;
  line-height: 2;
  &.--with-columns {
    display: block;
    columns: 300px;
    column-gap: 1rem;
    line-height: 2;
    font-family: ${(props) => props.theme.fonts.emphasis.fontFamily};
  }
`

const ListItem = styled.li`
  display: flex;
  gap: 1rem;
  @media (max-width: ${BREAKPOINTS.mobile}){
    flex-flow: column;
  }
`

const ItemTitle = styled.span`
  display: block;
  font-weight: ${(props) => props.theme.fonts.subTitle.fontWeight};
  font-style: italic;
`

const ItemInfo = styled.div`
  flex: 0 1 25%;
`

const ItemContent = styled.div`
  flex: 1;
  line-height: 2;
`

const SkillEmphasis = styled.p`
  font-family: ${(props) => props.theme.fonts.emphasis.fontFamily};
`

const Layout = ({
  pageTitle,
  pageSub,
  greetings,
  eduContent,
  expContent,
  skillContent,
  children }) => {
  return (
    <PageWrapper>
      <NavigationWrapper />
      <Main>
          <Container>
            <PageTitleH1 className='--vertical --big-font'>Hello!</PageTitleH1>
            <PageTitleH1 className='--medium-font'>{pageTitle}</PageTitleH1>
            <PageSubtitle role="doc-subtitle">{pageSub}</PageSubtitle>
            <Paragraph>
              {greetings.content}
            </Paragraph>
            <StaticImage
              className='--image-me'
              src='../../images/curriculum/thamires-helaysa.jpg'
              alt='Thamires Helaysa'
              width={600}
              height={720}/>
            <ContainerTwoColumns className='--two-columns'>
              <PageTitleH2 className='--small-t'>{eduContent.title}</PageTitleH2>
              <ItensList>
                {eduContent.content.map((item) => {
                  return (
                      <li key={`edu_content_${item.id}`}>
                        <ItemTitle>{item.what} - {item.when}</ItemTitle>
                        <p>{item.desc}</p>
                      </li>
                  )
                })}
              </ItensList>
            </ContainerTwoColumns>
            <ContainerTwoColumns className='--two-columns --second'>
              <PageTitleH2 className='--small-t'>{expContent.title}</PageTitleH2>
              <ItensList>
                {expContent.content.map((item) => {
                  return (
                      <ListItem key={`exp_content_${item.id}`}>
                        <ItemInfo>
                          <ItemTitle>{item.as}</ItemTitle>
                          <ItemTitle>{item.where}</ItemTitle>
                          <ItemTitle>{item.when}</ItemTitle>
                        </ItemInfo>
                        <ItemContent>
                          <p>{item.what}</p>
                          <SkillEmphasis>{item.with}</SkillEmphasis>
                        </ItemContent>
                      </ListItem>
                  )
                })}
              </ItensList>
            </ContainerTwoColumns>
            <ContainerTwoColumns className='--two-columns'>
              <PageTitleH2 className='--small-t'>{skillContent.title}</PageTitleH2>
              <ItensList className='--with-columns'>
                {skillContent.content.map((item) => {
                  return (
                      <li key={`skill_content_${item.id}`}>
                        <p>{item.skill}</p>
                      </li>
                  )
                })}
              </ItensList>
            </ContainerTwoColumns>
          </Container>
      </Main>
      <Footer />
    </PageWrapper>
  )
}

export default Layout
