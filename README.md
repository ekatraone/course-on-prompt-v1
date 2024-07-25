# Course Generator

This project is an automated course generation system that uses an LLM to create customized lesson plans and content. It integrates with Airtable for data storage and retrieval.

## Features

- Generates a 3-day lesson plan for a given course topic
- Creates detailed module content for each day
- Stores course information in Airtable
- Supports multiple languages
- Customizes content based on learning goals and styles

## Main Components

1. **OpenAI Integration**: Uses GPT-4 to generate course outlines and module content.
2. **Airtable Integration**: Creates tables and stores course data in Airtable.
3. **Course Generation Pipeline**: 
   - Creates a course outline
   - Generates detailed content for each module
   - Populates Airtable with the generated content

## Key Functions

- `ask(course_name, language)`: Generates a 3-day lesson plan outline.
- `create_table_fields(course_name, module_number)`: Creates an Airtable table for the course.
- `iterate_through_module(course_outline, goal, style, language)`: Generates detailed content for each module.
- `generate_course(senderID, course_name, goal, style, language)`: Main function that orchestrates the course generation process.
- `module_gen(module_topic, goal, style, language)`: Generates content for a specific module.

## Dependencies

- dotenv
- OpenAI API
- Airtable API
