import * as React from 'react';
import styled from "styled-components";
import { Link } from 'gatsby';

import BREAKPOINTS from '../../constants/breakpoints';
import FONTS from '../../constants/fonts';

import { TitleH3 } from '../Paragraphs/PageTitle';
import { Paragraph } from '../Paragraphs/Paragraph';

import TheSpanInYellow from '../Paragraphs/TheSpanInYellow';


const List = styled.div`
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
    margin-bottom: 3rem;
    @media (max-width: ${BREAKPOINTS.tablet}){
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }
    &:hover > .--item {
        opacity: 1;
        border-color: ${(props) => props.theme.colors.extra};
        border-style: dashed;
        &:not(:hover) {
            opacity: .2;
            border-color: inherit;
            border-style: solid;
        }
    }

    &.--flex {
        display: flex;
        flex-flow: column;
    }

`

const Item = styled.article`
    border: 4px solid;
    transition: all 300ms ease 0s;
    `

const StyledLink = styled(Link)`
    display: block;
    padding: 2rem;
    color: inherit;
    text-decoration: none;
`

const StyledParagraph = styled(Paragraph)`
    &.--paragraph {
        padding-bottom: 0;
    }
`

const LastPublishedLink = styled.div`
    margin-top: 1rem;
    font-weight: bold;
`

const SkillsList = styled.ul`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    font-weight: bold;
`

const PublishDate = styled.p`
    margin-bottom: 10px;
    font-family: ${FONTS.emphasis.fontFamily};
    font-size: 12px;
`


const CardsList = ({ dataList, lastPublished }) => {
    return (
        <List className={`${lastPublished && "--flex"}`}>
            {dataList.map((item,index) => (
                <Item key={item.id} className="--item">
                    <StyledLink to={item.excerpt ? `/blog/${item.frontmatter.slug}` : item.path}>
                        <div>
                            <TitleH3>{ item.frontmatter ? item.frontmatter.title : item.title }</TitleH3>
                            {item.frontmatter && item.frontmatter.date && <PublishDate>Posted on {item.frontmatter.date}</PublishDate>}
                            <StyledParagraph className="--paragraph">{ item.frontmatter ? item.frontmatter.desc : item.desc}</StyledParagraph>
                            {item.skills && <SkillsList>
                                {item.skills.map((skill, i) => (
                                    <li key={item.id + i}>
                                        <TheSpanInYellow>{skill}</TheSpanInYellow>
                                    </li>
                                ))}
                            </SkillsList>}
                        </div>
                        {lastPublished &&
                            <LastPublishedLink className='--last-pub-link'>
                                Read more
                            </LastPublishedLink>}
                    </StyledLink>
                </Item>
            ))}
        </List>
    )
}


export default CardsList
