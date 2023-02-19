import * as React from 'react';
import styled from 'styled-components';
import { StaticImage } from "gatsby-plugin-image"

import BREAKPOINTS from '../../constants/breakpoints';
import FONTS from '../../constants/fonts';

import NavigationWrapper from '../Navigation/Header';
import Main from '../Main/Content';
import Footer from '../Footer/Footer';

import { TitleH1, TitleH2 } from '../Paragraphs/PageTitle';
import SubTitle from '../Paragraphs/SubTitle';
import { StyledParagraph } from '../Paragraphs/Paragraph';
import { GlobalThemeProvider } from '../../hooks/useGlobalTheme';

import RecruiterBubble from '../Tooltip/Recruiter';
import ContactList from '../Listing/ContactList';

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
    @media print and (orientation: landscape){
      text-align: left;
      writing-mode: lr;
      transform: none;
    }
  }
  @media print {
    margin-top: 1rem;
    color: #c54551;
    text-shadow: none;
    &.--big-font {
      display: none;
    }
  }
`

const PageTitleH2 = styled(TitleH2)`
  display: flex;
  align-items: center;
  font-size: 3rem;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  @media print {
    break-inside: avoid;
    color: ${(props) => props.theme.colors.darkPink};
    font-size: 0!important;
    text-shadow: none;
    &::after {
      content: attr(data-title);
      font-size: 1.3rem!important;
    }
  }
  @media print and (orientation: landscape){
    height: 100px;
    text-align: left;
    writing-mode: lr;
    transform: none;
  }
  @media (max-width: ${BREAKPOINTS.tablet}){
    writing-mode: lr;
    transform: none;
  }
  
  
`

const PageSubtitle = styled(SubTitle)`
  position: absolute;
  grid-column: 2/3;
  grid-row: 2/3;
  top: -1rem;
  left: 0;
  @media print {
    position: static;
  }
`

const Paragraph = styled(StyledParagraph)`
  grid-column: 2/3;
  grid-row: 2/3;
  padding-right: 2vw;
  padding-bottom: 0;
  line-height: 2;
  @media (max-width: ${BREAKPOINTS.laptop}){
    grid-column: 2/span 2;
    padding-right: 0;
  }
  @media print {
    padding-right: 0;
    line-height: 1.8;
  }
`

const Container = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: auto 2fr 1fr;
  grid-template-rows: auto 1fr;
  gap: 2rem 1rem;
  max-width: 1100px;
  margin-left: auto;
  margin-right: auto;
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
    border: ${(props) => props.theme.colors.border};
    @media (max-width: ${BREAKPOINTS.laptop}){
      display: none;
    }
  }

  @media not print {
    & > .--with-me {
      display: none;
    }
  }

  @media print {
    display: block;
    padding: 0;
    gap: 1rem;
    &::after  {
      display: none;
    }
    & > .--with-me {
      margin-bottom: 1rem;
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

  @media print {
    display: block;
    padding: 0;
    border: 0;
    &.--first {
      break-inside: avoid-page;
      break-after: always;
    }
    & > .--small-t  {
      height: 70px;
    }
  }

`

const ItensList = styled.ul`
  display: flex;
  flex-flow: column;
  gap: 2rem;
  line-height: 2;
  &.--with-columns {
    display: block;
    columns: 200px;
    column-gap: 1rem;
    line-height: 2;
    font-family: ${FONTS.emphasis.fontFamily};
  }
  @media print {
    line-height: 1.8;
    &.--with-columns {
      columns: auto;
      column-count: 4;
    }
  }
`

const ListItem = styled.li`
  display: flex;
  gap: 1rem;
  @media (max-width: ${BREAKPOINTS.mobile}){
    flex-flow: column;
  }
  @media print {
    display: block;
    break-inside: avoid-page;
  }
`

const ItemTitle = styled.span`
  display: block;
  font-weight: ${FONTS.subTitle.fontWeight};
  font-style: italic;
`

const ItemInfo = styled.div`
  flex: 0 1 25%;
  @media print {
    display: flex;
    gap: 0 1rem;
  }
`

const ItemContent = styled.div`
  flex: 1;
  line-height: 2;
`

const SkillEmphasis = styled.p`
  font-family: ${FONTS.emphasis.fontFamily};
  @media print {
    font-size: .875rem;
  }
`

const ParagraphExp = styled(StyledParagraph)`
  padding-top: 0;
`

const Layout = ({
  pageTitle,
  pageSub,
  greetings,
  eduContent,
  expContent,
  skillContent,
  dataPhrases,
  children }) => {
  return (
    <GlobalThemeProvider>
      {children}
      <PageWrapper>
        <NavigationWrapper />
        <Main>
          <Container>
            <PageTitleH1 className='--vertical --big-font'>Hello!</PageTitleH1>
            <PageTitleH1 className='--medium-font'>{pageTitle}</PageTitleH1>
            <PageSubtitle role="doc-subtitle">{pageSub}</PageSubtitle>
            <ContactList className="--with-me">
              <li>
                <a href="https://t-helaysa.com/">
                <StaticImage
                  className='--image-me'
                  src="../../images/android-chrome-192x192.png"
                  alt='Thamires Helaysa'
                  width={24}
                  height={24}/>
                </a>
              </li>
            </ContactList>
            <Paragraph>
              {greetings.content}
            </Paragraph>
            <StaticImage
              className='--image-me'
              src='../../images/curriculum/thamires-helaysa.jpg'
              alt='Thamires Helaysa'
              width={600}
              height={720}/>
            <ContainerTwoColumns className='--two-columns --first'>
              <PageTitleH2 className='--small-t' data-title={eduContent.title.replace("-", "")}>{eduContent.title}</PageTitleH2>
              <ItensList>
                {eduContent.content.map((item) => {
                  return (
                      <li key={`edu_content_${item.id}`}>
                        <ItemTitle>{item.what} - {item.when}</ItemTitle>
                        <ParagraphExp>{item.desc}</ParagraphExp>
                      </li>
                  )
                })}
              </ItensList>
            </ContainerTwoColumns>
            <ContainerTwoColumns className='--two-columns --second'>
              <PageTitleH2 className='--small-t' data-title={expContent.title.replace("-", "")}>{expContent.title}</PageTitleH2>
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
                          <ParagraphExp>{item.what}</ParagraphExp>
                          <SkillEmphasis>{item.with}</SkillEmphasis>
                        </ItemContent>
                      </ListItem>
                  )
                })}
              </ItensList>
            </ContainerTwoColumns>
            <ContainerTwoColumns className='--two-columns'>
              <PageTitleH2 className='--small-t' data-title={skillContent.title.replace("-", "")}>{skillContent.title}</PageTitleH2>
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
          <RecruiterBubble>
            Tech Recruiter or just curious 👀? You can generate a pdf file <strong>(ctrl + p or ⌘ + p)</strong> of my resume!
          </RecruiterBubble>
        </Main>
        <Footer footerPhrases={dataPhrases} />
      </PageWrapper>
    </GlobalThemeProvider>
  )
}

export default Layout
