PRAGMA foreign_keys = ON;

INSERT INTO users (userid, fullname, email, password)
VALUES (
    1, 
    'Andrew DeOrio', 
    'awdeorio@umich.edu',
    'sha512$a45ffdcc71884853a2cba9e6bc55e812$9985dacd2a64ee5057d8be9589b057fe7f968530ffc9843e34f2aac814611b40664605723b35afb8eeb7f1a4dbd0f5c1066ae42b29567f76b5acabc7704ab34c'
);

INSERT INTO sessions (sessionid, userid)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    1
); 

INSERT INTO conversations
    (conversationid, uuid, sessionid, userid, title)
VALUES
    (
        1,
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        NULL,
        1,
        'Hello World'
    ),
    (
        2,
        'c3d4e5f6-a7b8-9012-cdef-123456789012',
        NULL,
        1,
        'Visiting Ann Arbor'
    );

INSERT INTO messages(messageid, conversationid, role, content)
VALUES
    (1, 1, 'user', 'Hello'),
    (2, 1, 'assistant', 'Hello'),
    (3, 1, 'user', 'world'),
    (4, 1, 'assistant', 'world'),
    (5, 1, 'user', 'Hello world!'),
    (6, 1, 'assistant', 'Hello world!');

INSERT INTO messages
    (messageid, conversationid, role, content)
VALUES
    (
        7,
        2,
        'user',
        'I am planning to visit Ann Arbor and the University of Michigan. I am a computer science student and I have heard great things about the program there. Where should I start?'
    ),
    (
        8,
        2,
        'assistant',
        'Ann Arbor is a great destination for a CS student. The city is home to one of the top computer science programs in the country and has a lively university town feel. I would start by understanding the campus layout. The University of Michigan has two main campuses: Central Campus and North Campus. For CS students, North Campus is especially relevant because that is where the engineering and computer science buildings are located.'
    ),
    (
        9,
        2,
        'user',
        'How do I get to Ann Arbor? I am coming from out of state.'
    );

INSERT INTO messages (messageid, conversationid, role, content)
VALUES
    (10, 2, 'assistant', 'The most common options are flying into Detroit Metropolitan Airport, which is about 30 miles from Ann Arbor, or taking an Amtrak train directly into Ann Arbor''s downtown station on the Michigan line from Chicago or the East Coast. If you are driving, Ann Arbor is right off Interstate 94 and easy to reach. From the airport you can take a cab, rideshare, or the Michigan Flyer bus service, which runs regularly between DTW and Ann Arbor.'),
    (11, 2, 'user', 'Where should I stay?'),
    (12, 2, 'assistant', 'There are a few good options depending on your budget. The Graduate Ann Arbor and the Bell Tower Hotel are popular mid-range choices close to Central Campus. If you want something more affordable, there are several hotels along Plymouth Road near North Campus and along Washtenaw Avenue. Airbnb options in the surrounding neighborhoods tend to be reasonably priced. For a first visit, staying near Central Campus gives you easy access to downtown and the main landmarks, with the free Blue Bus available to get you to North Campus.'),
    (13, 2, 'user', 'How do I get around once I am there?'),
    (14, 2, 'assistant', 'Ann Arbor has a public bus system called TheRide, and the university also runs its own free bus service called the Blue Bus. The Blue Bus is particularly useful for getting between Central Campus and North Campus without needing a car. It runs frequently on weekdays. Walking is easy on and around Central Campus since most things are close together. Biking is also popular and there are bike lanes on many roads. Rideshares are widely available as well.'),
    (15, 2, 'user', 'Tell me about Central Campus.'),
    (16, 2, 'assistant', 'Central Campus is the historic heart of the University of Michigan. It is anchored by the Diag, a large open quad that is the social center of campus life. Surrounding it are the main undergraduate library, Hill Auditorium, the Michigan League, and dozens of academic buildings. The area around South University Avenue and State Street has lots of student restaurants, coffee shops, and bookstores. The Law Quad is one of the most architecturally striking spots on campus. Central Campus has a very traditional Big Ten university feel.'),
    (17, 2, 'user', 'What is the Diag exactly?'),
    (18, 2, 'assistant', 'The Diag is short for the diagonal walkway that cuts across the main quad on Central Campus. It is the informal gathering place of the university. Students hang out there between classes, registered student organizations set up tables, and various events happen throughout the year. There is a large block M embedded in the pavement at the center, and according to tradition, stepping on it before your first blue book exam brings bad luck. It is a defining part of the Michigan experience and worth walking through.'),
    (19, 2, 'user', 'How do I get from Central Campus to North Campus?'),
    (20, 2, 'assistant', 'The easiest way is to take the Northwood or Commuter North Blue Bus routes, which connect Central Campus to North Campus and run every 10 to 15 minutes during the day. The ride takes about 10 minutes. You can board near the Michigan Union on South State Street or at several other stops around Central Campus. The buses are free and require no payment or ID. The distance by road is only about a mile and a half, so driving or biking are quick options too.'),
    (21, 2, 'user', 'What is North Campus like compared to Central Campus?'),
    (22, 2, 'assistant', 'North Campus has a very different feel. It was developed mostly in the 1950s and 1960s so the architecture is more modern and the layout is more spread out. It is home to the College of Engineering, the School of Music Theatre and Dance, and the Stamps School of Art and Design. The vibe is quieter and more focused. Pierpont Commons is the main student gathering space on North Campus, similar to how the Michigan Union functions on Central Campus. Food options are more limited than on Central Campus.'),
    (23, 2, 'user', 'Tell me about the Bob and Betty Beyster Building.'),
    (24, 2, 'assistant', 'The Bob and Betty Beyster Building opened in 2006 and is the main home of the Computer Science and Engineering division of the EECS department. It is named after Bob Beyster, a Michigan alumnus who founded SAIC, a major defense and technology company. The building is on North Campus just off Hayward Street. Inside you will find classrooms, faculty offices, research labs, and collaborative spaces for students. The atrium is open and modern and is a popular place for students to work between classes. Many of the CS research groups are housed here.'),
    (25, 2, 'user', 'What kind of research happens in the Beyster Building?'),
    (26, 2, 'assistant', 'The Beyster Building hosts research groups across a wide range of CS areas. You will find groups working on artificial intelligence and machine learning, systems and networks, programming languages, security, human-computer interaction, and database systems among others. Many professors there are internationally recognized in their fields. The building also houses computing labs and servers used for research. If you are thinking about graduate school, checking out the faculty pages for groups based in Beyster is a good starting point for understanding what research at Michigan looks like.'),
    (27, 2, 'user', 'What about the Leinweber Computer Science and Information Building?'),
    (28, 2, 'assistant', 'The Leinweber Building, sometimes called CSIB, is a newer addition to North Campus that opened in 2022. It houses the School of Information, which at Michigan is a separate school from the CS department but has significant overlap in areas like data science, human-computer interaction, and information systems. The building is modern and designed to encourage interdisciplinary collaboration. It sits close to the Beyster Building and the two buildings together form a kind of CS and information hub on North Campus.'),
    (29, 2, 'user', 'Is there a difference between the CS department and the School of Information?'),
    (30, 2, 'assistant', 'Yes, they are distinct units with different emphases. The Computer Science and Engineering program is part of the College of Engineering and focuses on the technical and systems side of computing. The School of Information, often called the iSchool, takes a broader view that includes how people and organizations interact with technology, data governance, privacy, and information access. At the graduate level there is the Master of Science in Information degree and a PhD program. Some students do joint work across both schools. The boundaries between the fields are increasingly blurry.'),
    (31, 2, 'user', 'What is there to eat near North Campus?'),
    (32, 2, 'assistant', 'Options near North Campus are more limited than Central Campus but there are solid spots. Pierpont Commons has a dining hall and some quick service options. Along Plymouth Road, which borders North Campus, there are several restaurants including some good Asian options and a few pizza places. If you have a car or bike it is easy to get to the Kerrytown district which has more variety. Many students on North Campus grab food at the dining hall and then head to Central Campus or downtown for dinner.'),
    (33, 2, 'user', 'What are the best food spots near Central Campus?'),
    (34, 2, 'assistant', 'The area around State Street and South University has a great mix. Zingerman''s Delicatessen is the most famous food spot in Ann Arbor and a must-visit, though it is a short walk from Central Campus toward downtown. It is known for enormous sandwiches and specialty foods. Frita Batidos is a Cuban-inspired burger place that is very popular. Jerusalem Garden has excellent Middle Eastern food and is affordable. For late night, Pizza House on Church Street is a local institution. Sweetwaters Coffee and Tea is a local chain with a strong following among students.'),
    (35, 2, 'user', 'Tell me more about Zingerman''s.'),
    (36, 2, 'assistant', 'Zingerman''s started as a single deli in 1982 and has grown into what it calls the Zingerman''s Community of Businesses, with a bakehouse, creamery, coffee company, catering operation, candy manufacturer, and several restaurants all under the same umbrella. The original deli on Detroit Street is the centerpiece and a genuine local landmark. Expect a line at lunchtime but it moves quickly. The sandwiches are large and on the expensive side but most people find them worth it. It has been written up in the New York Times and other national publications as one of the great delis in the country.'),
    (37, 2, 'user', 'What is State Street like?'),
    (38, 2, 'assistant', 'State Street runs along the eastern edge of Central Campus and is the main commercial strip for the university. It has coffee shops, restaurants, clothing stores, and bookstores. The University of Michigan official bookstore is there along with several other shops. The street is lively during the day and on football weekends it becomes extremely crowded. It connects down toward the Ann Arbor downtown area and blends into the broader commercial zone around Liberty Street and Main Street. Walking down State Street gives you a good feel for university life.'),
    (39, 2, 'user', 'What about Main Street downtown?'),
    (40, 2, 'assistant', 'Main Street is the heart of Ann Arbor''s downtown commercial district and has a more upscale feel than the campus strips, with independent restaurants, bars, boutique shops, and galleries. The Ann Arbor Farmers Market in Kerrytown is just north of Main Street and worth a visit on Saturday mornings. The Michigan Theater on Liberty Street is a beautifully restored 1920s movie palace that shows art house films and hosts live performances. Downtown Ann Arbor has consistently been ranked among the best small cities in the country for quality of life.'),
    (41, 2, 'user', 'Should I try to see a Michigan football game?'),
    (42, 2, 'assistant', 'If you can, yes. Michigan Stadium, known as the Big House, is the largest stadium in the United States with a capacity of over 100,000 people. The atmosphere on game day is unlike anything most people have experienced. Home games on Saturdays in the fall transform the entire city. Tickets for big games can be expensive and hard to find, but even being in Ann Arbor on a game day and walking around the tailgate areas near the stadium is worth experiencing. The stadium is on the south side of Central Campus, a short walk from the Diag.'),
    (43, 2, 'user', 'What museums or cultural spots are worth visiting?'),
    (44, 2, 'assistant', 'The University of Michigan Museum of Art, known as UMMA, on South University Avenue has a strong collection for a university museum including American, European, and Asian art. Admission is free. The Kelsey Museum of Archaeology nearby has a fascinating collection of ancient artifacts. The Natural History Museum on North University Avenue has excellent exhibits including impressive dinosaur fossils. The Nichols Arboretum, known to locals as the Arb, is a 123-acre green space along the Huron River that is beautiful to walk through, especially in spring and fall.'),
    (45, 2, 'user', 'What is the Law Quad?'),
    (46, 2, 'assistant', 'The Law Quad is a Gothic-style architectural complex on the south side of Central Campus. It was built in the 1920s and 1930s and is modeled after the colleges of Oxford and Cambridge. The buildings include the reading room of the law library, which is one of the most stunning interior spaces on campus. Even if you have no interest in law school, walking through the courtyard and peeking into the library reading room is worth the time. It is one of the more photogenic spots on campus and gives a sense of the grandeur the university aimed for during that era.'),
    (47, 2, 'user', 'I heard Ann Arbor has a good tech scene outside of the university. Is that true?'),
    (48, 2, 'assistant', 'Yes, Ann Arbor has a meaningful tech and startup ecosystem beyond the university. Companies like Google, Duo Security which was acquired by Cisco, and Barracuda Networks have had significant presences there. There are co-working spaces and incubators in the downtown area. The university''s technology transfer office has spun out a number of companies. The proximity to Detroit also ties Ann Arbor into the automotive technology sector, with several companies working on connected vehicles and autonomous driving having offices in the area. It is not a major tech hub but it is a genuinely active environment.'),
    (49, 2, 'user', 'What is the EECS department known for specifically?'),
    (50, 2, 'assistant', 'Michigan''s EECS department has a long and strong reputation. It has been particularly well regarded in computer architecture, operating systems, compilers, and embedded systems. More recently it has built strong programs in machine learning, robotics, security, and human-computer interaction. The department consistently ranks among the top ten in the country. It is large, which means many resources and research opportunities, but undergraduate students sometimes need to be more proactive about connecting with faculty. The graduate program is very competitive and highly regarded by employers.'),
    (51, 2, 'user', 'Can you name some notable alumni from Michigan''s CS or engineering programs?'),
    (52, 2, 'assistant', 'Michigan has an impressive list of technology alumni. Larry Page, the co-founder of Google, did his undergraduate degree at Michigan before his PhD at Stanford. Brendan Iribe, a co-founder of Oculus VR, studied at Michigan. Jim Barksdale, former CEO of Netscape, also attended. In the broader engineering space, the university has produced a remarkable number of astronauts. The alumni network in tech is considered one of the strengths of a Michigan degree, with strong clusters in Silicon Valley, Seattle, and New York.'),
    (53, 2, 'user', 'What about graduate school at Michigan for CS? Is it worth considering?'),
    (54, 2, 'assistant', 'Michigan''s CS PhD and master''s programs are highly competitive and well respected. The PhD program is research-focused and students work closely with faculty on original research. The master''s program draws a large number of applicants and produces graduates who go into industry at top companies. Tuition for the master''s program can be significant for out-of-state students since it is a professionally funded degree, which is worth factoring in. For a PhD, admitted students are typically funded through research or teaching assistantships. The research output of the department is strong.'),
    (55, 2, 'user', 'What time of year is best to visit Ann Arbor?'),
    (56, 2, 'assistant', 'Late April and early May are spectacular when the trees are blooming and the weather is mild. Fall is also beautiful, particularly September and October when the foliage is turning and football season is in full swing. Summers are pleasant and the city is quieter since fewer students are around, which can be nice if you want to explore without crowds. Winter in Ann Arbor is genuinely cold with real snowfall, so plan accordingly if you visit between December and March. Spring has a tendency toward rain but the campus comes alive quickly once the weather warms.'),
    (57, 2, 'user', 'What should I pack for a spring visit?'),
    (58, 2, 'assistant', 'Michigan spring weather is unpredictable. Mornings can be cold enough for a heavy jacket and afternoons warm enough for just a light layer, so layering is essential. Comfortable walking shoes are a must since you will be covering a lot of ground on foot between buildings, campuses, and downtown. Bring a rain jacket since April and May see regular rain. If you are visiting on a football Saturday in the fall, dress in maize and blue if you want to fit in and bring layers since Michigan Stadium is an open air venue.'),
    (59, 2, 'user', 'Are there any traditions or things I should know about Michigan culture?'),
    (60, 2, 'assistant', 'Michigan has a strong sense of institutional pride. The rivalry with Ohio State is intense. Students say go blue rather than go Michigan. The fight song, Hail to the Victors, is everywhere on game days. The yellow and blue color scheme, officially maize and blue, is ubiquitous. Michigan graduates have a tendency to identify strongly with the university in a way that is unusual even for a major public school. You will also hear references to the Michigan Difference, a phrase used to describe the ambition and accomplishment that the university culture encourages.'),
    (61, 2, 'user', 'Is there anything specific I should do as a CS student visiting?'),
    (62, 2, 'assistant', 'Walk through both the Beyster Building and the Leinweber Building to get a feel for the research environment. Look at the posters outside faculty offices and lab doors to get a sense of active research projects. If you arrange it in advance, some professors or PhD students are happy to do informal informational meetings with prospective students. The CSE website lists current research groups and their contact information. Attending a colloquium or departmental talk if one is scheduled during your visit is also worthwhile. The Michigan Hackers student organization sometimes hosts public events as well.'),
    (63, 2, 'user', 'What is a typical day itinerary you would suggest?'),
    (64, 2, 'assistant', 'If you only have one full day, start in the morning with coffee on State Street, then walk Central Campus including the Diag, the Law Quad, and UMMA. Have lunch at Zingerman''s or one of the places near South University. In the afternoon, take the Blue Bus to North Campus and spend a couple hours exploring the Beyster Building and the Leinweber Building. Come back to Central Campus for dinner and explore the downtown Main Street area in the evening. If you have two days, add the Arb in the morning of the second day and Kerrytown in the afternoon.'),
    (65, 2, 'user', 'This has been really helpful. Any final tips for making the most of the visit?'),
    (66, 2, 'assistant', 'Talk to students and faculty if you get the chance. People at Michigan are generally proud of the university and happy to share their experiences. Do not underestimate how much ground you will cover on foot and wear comfortable shoes. If you are seriously considering Michigan for graduate school, try to schedule your visit around an open house or visit day event since those give you structured access to faculty and current students. And take some time to sit on the Diag on a nice day and absorb the atmosphere. It gives you a genuine sense of what it would feel like to be a Michigan student.');