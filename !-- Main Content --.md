<!-- Main Content -->  
<main id="app" class="flex-grow pt-16">  
    <!-- Dynamic content loads here -->  
</main>  
  
<!-- Footer -->  
<footer class="bg-dark-800 border-t border-white/10 mt-20">  
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">  
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">  
            <div class="col-span-1 md:col-span-2">  
                <span class="text-2xl font-display font-bold gradient-text">Seeylo</span>  
                <p class="mt-4 text-gray-400 max-w-sm">  
                    Professional trading education platform. Master the markets with expert-led courses and strategies.  
                </p>  
            </div>  
            <div>  
                <h3 class="font-semibold text-white mb-4">Platform</h3>  
                <ul class="space-y-2 text-gray-400">  
                    <li><button onclick="router.navigate('courses')" class="hover:text-white transition">Courses</button></li>  
                    <li><button onclick="router.navigate('dashboard')" class="hover:text-white transition">Dashboard</button></li>  
                </ul>  
            </div>  
            <div>  
                <h3 class="font-semibold text-white mb-4">Support</h3>  
                <ul class="space-y-2 text-gray-400">  
                    <li><a href="#" class="hover:text-white transition">Help Center</a></li>  
                    <li><a href="#" class="hover:text-white transition">Contact</a></li>  
                </ul>  
            </div>  
        </div>  
        <div class="border-t border-white/10 mt-12 pt-8 text-center text-gray-500">  
            <p>&copy; 2026 Seeylo. All rights reserved.</p>  
        </div>  
    </div>  
</footer>  
  
<script>  
    // Application State  
    const state = {  
        currentUser: null,  
        courses: [  
            {  
                id: 'beginner',  
                title: 'Beginner Trading Guide',  
                subtitle: 'Master the fundamentals',  
                price: 39.99,  
                type: 'beginner',  
                description: 'Complete foundation course covering market basics, risk management, and trading psychology. Includes recommended trading pairs analysis.',  
                modules: [  
                    { title: 'Introduction to Markets', duration: '15 min', type: 'video' },  
                    { title: 'Understanding Charts', duration: '25 min', type: 'video' },  
                    { title: 'Risk Management Basics', duration: '20 min', type: 'video' },  
                    { title: 'Trading Psychology', duration: '30 min', type: 'video' },  
                    { title: 'Recommended Pairs Overview', duration: '45 min', type: 'video' }  
                ],  
                level: 'Beginner',  
                duration: '2.5 hours'  
            },  
            {  
                id: 'eurusd-1',  
                title: 'EUR/USD Strategy Foundations',  
                subtitle: 'Course 1: Build your foundation',  
                price: 24.99,  
                type: 'advanced',  
                pair: 'EUR/USD',  
                courseNumber: 1,  
                description: 'Learn the foundational strategies for trading EUR/USD. Includes entry/exit techniques and basic pattern recognition.',  
                modules: [  
                    { title: 'EUR/USD Market Structure', duration: '20 min', type: 'video' },  
                    { title: 'Support & Resistance Basics', duration: '25 min', type: 'video' },  
                    { title: 'Entry Signal Identification', duration: '30 min', type: 'video' }  
                ],  
                level: 'Intermediate',  
                duration: '1.25 hours',  
                prerequisite: 'beginner'  
            },  
            {  
                id: 'eurusd-2',  
                title: 'EUR/USD Advanced Strategy',  
                subtitle: 'Course 2: Refine your edge',  
                price: 14.99,  
                type: 'advanced',  
                pair: 'EUR/USD',  
                courseNumber: 2,  
                description: 'Advanced techniques including multi-timeframe analysis, correlation trading, and refined entry methods.',  
                modules: [  
                    { title: 'Multi-Timeframe Analysis', duration: '25 min', type: 'video' },  
                    { title: 'Correlation Strategies', duration: '20 min', type: 'video' },  
                    { title: 'Advanced Pattern Recognition', duration: '35 min', type: 'video' }  
                ],  
                level: 'Advanced',  
                duration: '1.3 hours',  
                prerequisite: 'eurusd-1'  
            },  
            {  
                id: 'eurusd-3',  
                title: 'EUR/USD Pro Execution',  
                subtitle: 'Course 3: Master execution',  
                price: 29.99,  
                type: 'advanced',  
                pair: 'EUR/USD',  
                courseNumber: 3,  
                description: 'Professional execution techniques, institutional order flow, and advanced risk management for EUR/USD.',  
                modules: [  
                    { title: 'Order Flow Analysis', duration: '35 min', type: 'video' },  
                    { title: 'Institutional Levels', duration: '30 min', type: 'video' },  
                    { title: 'Execution Algorithms', duration: '40 min', type: 'video' },  
                    { title: 'Live Trade Examples', duration: '45 min', type: 'video' }  
                ],  
                level: 'Professional',  
                duration: '2.5 hours',  
                prerequisite: 'eurusd-2'  
            },  
            {  
                id: 'gbpusd-1',  
                title: 'GBP/USD Strategy Foundations',  
                subtitle: 'Course 1: Build your foundation',  
                price: 24.99,  
                type: 'advanced',  
                pair: 'GBP/USD',  
                courseNumber: 1,  
                description: 'Master GBP/USD volatility and unique characteristics. Foundation strategies for the "Cable".',  
                modules: [  
                    { title: 'GBP/USD Characteristics', duration: '20 min', type: 'video' },  
                    { title: 'Volatility Management', duration: '25 min', type: 'video' },  
                    { title: 'London Session Focus', duration: '30 min', type: 'video' }  
                ],  
                level: 'Intermediate',  
                duration: '1.25 hours',  
                prerequisite: 'beginner'  
            },  
            {  
                id: 'gbpusd-2',  
                title: 'GBP/USD Advanced Strategy',  
                subtitle: 'Course 2: Refine your edge',  
                price: 14.99,  
                type: 'advanced',  
                pair: 'GBP/USD',  
                courseNumber: 2,  
                description: 'Advanced GBP/USD strategies including news trading techniques and breakout methodologies.',  
                modules: [  
                    { title: 'News Trading Setup', duration: '25 min', type: 'video' },  
                    { title: 'Breakout Strategies', duration: '30 min', type: 'video' },  
                    { title: 'False Breakout Protection', duration: '20 min', type: 'video' }  
                ],  
                level: 'Advanced',  
                duration: '1.25 hours',  
                prerequisite: 'gbpusd-1'  
            },  
            {  
                id: 'gbpusd-3',  
                title: 'GBP/USD Pro Execution',  
                subtitle: 'Course 3: Master execution',  
                price: 29.99,  
                type: 'advanced',  
                pair: 'GBP/USD',  
                courseNumber: 3,  
                description: 'Professional execution for GBP/USD including algorithmic considerations and institutional tactics.',  
                modules: [  
                    { title: 'Algorithmic Detection', duration: '35 min', type: 'video' },  
                    { title: 'Smart Money Concepts', duration: '40 min', type: 'video' },  
                    { title: 'Advanced Risk Models', duration: '35 min', type: 'video' }  
                ],  
                level: 'Professional',  
                duration: '1.8 hours',  
                prerequisite: 'gbpusd-2'  
            }  
        ],  
        purchases: [],  
        promoCode: '',  
        promoApplied: false,  
        checkoutData: null  
    };  
  
    // Router  
    const router = {  
        currentRoute: 'home',  
        navigate(route, params = {}) {  
            this.currentRoute = route;  
            window.scrollTo(0, 0);  
            this.render(route, params);  
            this.updateURL(route, params);  
        },  
        render(route, params) {  
            const app = document.getElementById('app');  
            if (!app) return;  
              
            let html = '';  
              
            switch(route) {  
                case 'home':  
                    html = this.views.home();  
                    break;  
                case 'courses':  
                    html = this.views.courses();  
                    break;  
                case 'course':  
                    html = this.views.courseDetail(params.id);  
                    break;  
                case 'checkout':  
                    html = this.views.checkout(params);  
                    break;  
                case 'success':  
                    html = this.views.success(params);  
                    break;  
                case 'dashboard':  
                    if (!state.currentUser) {  
                        this.navigate('home');  
                        return;  
                    }  
                    html = this.views.dashboard();  
                    break;  
                case 'learn':  
                    if (!state.currentUser) {  
                        this.navigate('home');  
                        return;  
                    }  
                    html = this.views.learn(params.courseId);  
                    break;  
                default:  
                    html = this.views.home();  
            }  
              
            app.innerHTML = html;  
              
            if (window.lucide) {  
                lucide.createIcons();  
            }  
        },  
        updateURL(route, params) {  
            const url = new URL(window.location);  
            url.pathname = route === 'home' ? '/' : '/' + route;  
            window.history.pushState({}, '', url);  
        },  
        views: {  
            home() {  
                return `  
                    <div class="hero-gradient min-h-screen flex items-center justify-center relative overflow-hidden">  
                        <div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'[http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\](http://www.w3.org/2000/svg%5C'%253E%253Cg%20fill=%5C'none%5C'%20fill-rule=%5C'evenodd%5C'%253E%253Cg%20fill=%5C'%25239C92AC%5C)' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>  
                        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">  
                            <div class="text-center animate-fade-in">  
                                <div class="inline-flex items-center px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium mb-8">  
                                    <span class="w-2 h-2 rounded-full bg-brand-500 mr-2 animate-pulse"></span>  
                                    Professional Trading Education  
                                </div>  
                                <h1 class="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">  
                                    Master the <span class="gradient-text">Markets</span><br>  
                                    With Confidence  
                                </h1>  
                                <p class="text-xl text-gray-400 max-w-2xl mx-auto mb-10">  
                                    Comprehensive trading courses designed by professionals. From beginner fundamentals to advanced pair-specific strategies.  
                                </p>  
                                <div class="flex flex-col sm:flex-row gap-4 justify-center">  
                                    <button onclick="router.navigate('courses')" class="bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition transform hover:scale-105">  
                                        Explore Courses  
                                    </button>  
                                    <button onclick="document.getElementById('features').scrollIntoView({behavior: 'smooth'})" class="bg-white/5 hover:bg-white/10 border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-lg transition">  
                                        Learn More  
                                    </button>  
                                </div>  
                            </div>  
                              
                            <div id="features" class="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">  
                                <div class="glass-card p-8 rounded-2xl">  
                                    <div class="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center mb-6">  
                                        <i data-lucide="graduation-cap" class="w-6 h-6 text-brand-400"></i>  
                                    </div>  
                                    <h3 class="text-xl font-semibold mb-3">Structured Learning</h3>  
                                    <p class="text-gray-400">Progressive curriculum from basics to advanced pair-specific strategies.</p>  
                                </div>  
                                <div class="glass-card p-8 rounded-2xl">  
                                    <div class="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center mb-6">  
                                        <i data-lucide="trending-up" class="w-6 h-6 text-brand-400"></i>  
                                    </div>  
                                    <h3 class="text-xl font-semibold mb-3">Proven Strategies</h3>  
                                    <p class="text-gray-400">Battle-tested methods used by professional traders in live markets.</p>  
                                </div>  
                                <div class="glass-card p-8 rounded-2xl">  
                                    <div class="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center mb-6">  
                                        <i data-lucide="shield" class="w-6 h-6 text-brand-400"></i>  
                                    </div>  
                                    <h3 class="text-xl font-semibold mb-3">Risk Management</h3>  
                                    <p class="text-gray-400">Learn to protect capital while maximizing returns with proper risk protocols.</p>  
                                </div>  
                            </div>  
                        </div>  
                    </div>  
                      
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">  
                        <div class="text-center mb-16">  
                            <h2 class="text-3xl md:text-4xl font-display font-bold mb-4">Learning Path</h2>  
                            <p class="text-gray-400">Your journey to trading mastery</p>  
                        </div>  
                        <div class="relative">  
                            <div class="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-brand-500/50 to-transparent"></div>  
                            <div class="space-y-12">  
                                <div class="flex items-center justify-center">  
                                    <div class="glass-card p-6 rounded-xl max-w-md w-full mr-auto md:mr-8 relative">  
                                        <div class="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-brand-500 border-4 border-dark-900 hidden md:block"></div>  
                                        <span class="text-brand-400 font-semibold text-sm">Step 1</span>  
                                        <h3 class="text-xl font-bold mt-2">Beginner Guide</h3>  
                                        <p class="text-gray-400 mt-2">Master fundamentals and discover which pairs suit your style.</p>  
                                    </div>  
                                </div>  
                                <div class="flex items-center justify-center">  
                                    <div class="glass-card p-6 rounded-xl max-w-md w-full ml-auto md:ml-8 relative">  
                                        <div class="absolute -left-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-brand-500 border-4 border-dark-900 hidden md:block"></div>  
                                        <span class="text-brand-400 font-semibold text-sm">Step 2</span>  
                                        <h3 class="text-xl font-bold mt-2">Choose Your Pair</h3>  
                                        <p class="text-gray-400 mt-2">Select EUR/USD, GBP/USD, or other major pairs for specialization.</p>  
                                    </div>  
                                </div>  
                                <div class="flex items-center justify-center">  
                                    <div class="glass-card p-6 rounded-xl max-w-md w-full mr-auto md:mr-8 relative">  
                                        <div class="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-brand-500 border-4 border-dark-900 hidden md:block"></div>  
                                        <span class="text-brand-400 font-semibold text-sm">Step 3</span>  
                                        <h3 class="text-xl font-bold mt-2">Advanced Mastery</h3>  
                                        <p class="text-gray-400 mt-2">Complete all 3 courses for your chosen pair to become an expert.</p>  
                                    </div>  
                                </div>  
                            </div>  
                        </div>  
                    </div>  
                `;  
            },  
            courses() {  
                const beginnerCourse = state.courses.find(c => c.type === 'beginner');  
                const advancedCourses = state.courses.filter(c => c.type === 'advanced');  
                const pairs = [...new Set(advancedCourses.map(c => c.pair))];  
                  
                let pairsHtml = '';  
                pairs.forEach(pair => {  
                    const pairCourses = advancedCourses.filter(c => c.pair === pair).sort((a,b) => a.courseNumber - b.courseNumber);  
                    const bundlePrice = pairCourses.reduce((sum, c) => sum + c.price, 0) * 0.9;  
                      
                    let coursesCards = '';  
                    pairCourses.forEach(course => {  
                        coursesCards += `  
                            <div class="glass-card rounded-xl overflow-hidden course-card transition duration-300 cursor-pointer" onclick="router.navigate('course', {id: '${course.id}'})">  
                                <div class="h-32 pair-badge flex items-center justify-center relative">  
                                    <span class="text-3xl font-bold text-brand-400">${course.pair}</span>  
                                    <div class="absolute top-4 right-4 w-8 h-8 rounded-full bg-dark-900/80 flex items-center justify-center text-white font-bold border border-white/20">  
                                        ${course.courseNumber}  
                                    </div>  
                                </div>  
                                <div class="p-6">  
                                    <div class="flex items-center space-x-2 mb-3">  
                                        <span class="px-2 py-1 rounded bg-brand-500/20 text-brand-400 text-xs">${course.level}</span>  
                                        <span class="text-gray-500 text-xs">${course.duration}</span>  
                                    </div>  
                                    <h4 class="font-semibold text-lg mb-2">${course.title}</h4>  
                                    <p class="text-gray-400 text-sm mb-4 line-clamp-2">${course.description}</p>  
                                    <div class="flex items-center justify-between pt-4 border-t border-white/10">  
                                        <span class="text-xl font-bold">$${course.price}</span>  
                                        <button onclick="event.stopPropagation(); initiateCheckout('single', '${course.id}')" class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-full text-sm font-medium transition">  
                                            Buy Now  
                                        </button>  
                                    </div>  
                                </div>  
                            </div>  
                        `;  
                    });  
                      
                    pairsHtml += `  
                        <div class="mb-16">  
                            <div class="flex items-center justify-between mb-6">  
                                <h3 class="text-xl font-semibold text-brand-400">${pair} Track</h3>  
                                <button onclick="initiateCheckout('bundle', '${pair}')" class="text-sm bg-white/5 hover:bg-white/10 border border-white/20 px-4 py-2 rounded-full transition">  
                                    Buy Bundle (Save 10%) - $${bundlePrice.toFixed(2)}  
                                </button>  
                            </div>  
                            <div class="grid md:grid-cols-3 gap-6">  
                                ${coursesCards}  
                            </div>  
                        </div>  
                    `;  
                });  
                  
                return `  
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">  
                        <div class="text-center mb-16">  
                            <h1 class="text-4xl md:text-5xl font-display font-bold mb-4">Trading Courses</h1>  
                            <p class="text-gray-400 text-lg">Choose your path to trading mastery</p>  
                        </div>  
  
                        <div class="mb-20">  
                            <h2 class="text-2xl font-semibold mb-8 flex items-center">  
                                <span class="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center mr-3 text-sm">1</span>  
                                Start Here  
                            </h2>  
                            <div class="glass-card rounded-2xl overflow-hidden hover:border-brand-500/50 transition duration-300">  
                                <div class="grid md:grid-cols-2 gap-0">  
                                    <div class="h-64 md:h-auto bg-gradient-to-br from-brand-900/50 to-dark-800 flex items-center justify-center p-8">  
                                        <div class="text-center">  
                                            <div class="w-20 h-20 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-4">  
                                                <i data-lucide="book-open" class="w-10 h-10 text-brand-400"></i>  
                                            </div>  
                                            <span class="text-2xl font-bold text-brand-400">Beginner</span>  
                                        </div>  
                                    </div>  
                                    <div class="p-8 md:p-12 flex flex-col justify-center">  
                                        <div class="flex items-center space-x-2 mb-4">  
                                            <span class="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">Beginner</span>  
                                            <span class="text-gray-500 text-sm">${beginnerCourse.duration}</span>  
                                        </div>  
                                        <h3 class="text-3xl font-bold mb-3">${beginnerCourse.title}</h3>  
                                        <p class="text-gray-400 mb-6 text-lg">${beginnerCourse.description}</p>  
                                        <div class="flex items-center justify-between">  
                                            <span class="text-3xl font-bold text-white">$${beginnerCourse.price}</span>  
                                            <button onclick="initiateCheckout('single', '${beginnerCourse.id}')" class="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-full font-semibold transition">  
                                                Buy Now  
                                            </button>  
                                        </div>  
                                    </div>  
                                </div>  
                            </div>  
                        </div>  
  
                        <div>  
                            <h2 class="text-2xl font-semibold mb-8 flex items-center">  
                                <span class="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center mr-3 text-sm">2</span>  
                                Advanced Pair Specialization  
                            </h2>  
                            <p class="text-gray-400 mb-8">Complete all 3 courses for any pair and save 10%</p>  
                            ${pairsHtml}  
                        </div>  
                    </div>  
                `;  
            },  
            courseDetail(id) {  
                const course = state.courses.find(c => c.id === id);  
                if (!course) return '<div class="p-20 text-center">Course not found</div>';  
                  
                const isOwned = state.purchases.includes(id);  
                const pairCourses = course.type === 'advanced' ?   
                    state.courses.filter(c => c.type === 'advanced' && c.pair === course.pair).sort((a,b) => a.courseNumber - b.courseNumber) :   
                    [];  
                  
                let modulesHtml = '';  
                course.modules.forEach((module, idx) => {  
                    modulesHtml += `  
                        <div class="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition">  
                            <div class="flex items-center space-x-4">  
                                <div class="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-semibold">  
                                    ${idx + 1}  
                                </div>  
                                <div>  
                                    <h4 class="font-medium">${module.title}</h4>  
                                    <span class="text-sm text-gray-500">${module.type === 'video' ? 'Video Lesson' : 'Reading'}</span>  
                                </div>  
                            </div>  
                            <span class="text-gray-500 text-sm">${module.duration}</span>  
                        </div>  
                    `;  
                });  
                  
                const headerContent = course.type === 'beginner'   
                    ? `<div class="h-64 md:h-auto bg-gradient-to-br from-brand-900/50 to-dark-800 flex items-center justify-center p-8"><div class="text-center"><div class="w-20 h-20 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-4"><i data-lucide="book-open" class="w-10 h-10 text-brand-400"></i></div><span class="text-2xl font-bold text-brand-400">Beginner</span></div></div>`  
                    : `<div class="h-64 md:h-auto pair-badge flex items-center justify-center p-8"><span class="text-5xl font-bold text-brand-400">${course.pair}</span></div>`;  
                  
                return `  
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">  
                        <button onclick="router.navigate('courses')" class="mb-8 text-gray-400 hover:text-white flex items-center transition">  
                            <i data-lucide="arrow-left" class="w-4 h-4 mr-2"></i> Back to Courses  
                        </button>  
                          
                        <div class="glass-card rounded-2xl overflow-hidden mb-8">  
                            <div class="grid md:grid-cols-2 gap-0">  
                                ${headerContent}  
                                <div class="p-8 md:p-12 flex flex-col justify-center">  
                                    <div class="flex items-center space-x-2 mb-4">  
                                        <span class="px-3 py-1 rounded-full bg-brand-500/20 text-brand-400 text-xs font-semibold">${course.level}</span>  
                                        <span class="text-gray-500 text-sm">${course.duration}</span>  
                                    </div>  
                                    <h1 class="text-4xl font-bold mb-4">${course.title}</h1>  
                                    <p class="text-xl text-gray-400 mb-8">${course.description}</p>  
                                      
                                    ${isOwned ? `  
                                        <button onclick="router.navigate('learn', {courseId: '${course.id}'})" class="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-full font-semibold transition flex items-center justify-center">  
                                            <i data-lucide="play" class="w-5 h-5 mr-2"></i> Start Learning  
                                        </button>  
                                    ` : `  
                                        <div class="flex items-center justify-between mb-6">  
                                            <span class="text-4xl font-bold">$${course.price}</span>  
                                            ${course.type === 'advanced' && pairCourses.length === 3 ? `  
                                                <span class="text-sm text-gray-400">Bundle: $${(pairCourses.reduce((sum, c) => sum + c.price, 0) * 0.9).toFixed(2)}</span>  
                                            ` : ''}  
                                        </div>  
                                          
                                        ${course.prerequisite && !state.purchases.includes(course.prerequisite) ? `  
                                            <div class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">  
                                                <p class="text-sm text-yellow-400">  
                                                    <i data-lucide="alert-circle" class="w-4 h-4 inline mr-1"></i>  
                                                    Prerequisites required. Complete previous courses first.  
                                                </p>  
                                            </div>  
                                        ` : `  
                                            <button onclick="initiateCheckout('single', '${course.id}')" class="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-full font-semibold transition mb-4">  
                                                Buy Now  
                                            </button>  
                                        `}  
                                          
                                        ${course.type === 'advanced' ? `  
                                            <button onclick="initiateCheckout('bundle', '${course.pair}')" class="w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white py-3 rounded-full font-semibold transition">  
                                                Buy ${course.pair} Bundle (Save 10%)  
                                            </button>  
                                        ` : ''}  
                                    `}  
                                </div>  
                            </div>  
                        </div>  
                          
                        <div class="glass-card rounded-xl p-6 mb-8">  
                            <h3 class="text-xl font-semibold mb-6">Course Content</h3>  
                            <div class="space-y-4">  
                                ${modulesHtml}  
                            </div>  
                        </div>  
                    </div>  
                `;  
            },  
            checkout(params) {  
                const { type, courseId, pair } = params;  
                let items = [];  
                let subtotal = 0;  
                let title = '';  
                  
                if (type === 'bundle' && pair) {  
                    items = state.courses.filter(c => c.type === 'advanced' && c.pair === pair);  
                    subtotal = items.reduce((sum, c) => sum + c.price, 0) * 0.9;  
                    title = `${pair} Bundle (3 Courses)`;  
                } else if (courseId) {  
                    const course = state.courses.find(c => c.id === courseId);  
                    items = [course];  
                    subtotal = course.price;  
                    title = course.title;  
                }  
                  
                // Store checkout data for success page  
                state.checkoutData = {  
                    type,  
                    courseId,  
                    pair,  
                    items: items.map(i => i.id),  
                    subtotal  
                };  
                  
                const discount = state.promoApplied ? subtotal * 0.15 : 0;  
                const total = subtotal - discount;  
                  
                let itemsHtml = '';  
                items.forEach(item => {  
                    const itemPrice = type === 'bundle' ? (item.price * 0.9) : item.price;  
                    itemsHtml += `  
                        <div class="flex justify-between items-center py-3 border-b border-white/5">  
                            <div>  
                                <p class="font-medium">${item.title}</p>  
                                ${type === 'bundle' ? '<span class="text-xs text-brand-400">Bundle Discount Applied</span>' : ''}  
                            </div>  
                            <span class="font-semibold">$${itemPrice.toFixed(2)}</span>  
                        </div>  
                    `;  
                });  
                  
                return `  
                    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">  
                        <button onclick="router.navigate('courses')" class="mb-8 text-gray-400 hover:text-white flex items-center transition">  
                            <i data-lucide="arrow-left" class="w-4 h-4 mr-2"></i> Back to Courses  
                        </button>  
                          
                        <h1 class="text-3xl font-bold mb-8">Checkout</h1>  
                          
                        <div class="glass-card rounded-xl p-6 mb-6">  
                            <h3 class="font-semibold mb-4 text-lg">${title}</h3>  
                            <div class="space-y-2 mb-6">  
                                ${itemsHtml}  
                            </div>  
                              
                            <div class="border-t border-white/10 pt-4 space-y-2">  
                                <div class="flex justify-between text-gray-400">  
                                    <span>Subtotal</span>  
                                    <span>$${subtotal.toFixed(2)}</span>  
                                </div>  
                                ${state.promoApplied ? `  
                                    <div class="flex justify-between text-green-400">  
                                        <span>Promo Discount (15%)</span>  
                                        <span>-$${discount.toFixed(2)}</span>  
                                    </div>  
                                ` : ''}  
                                <div class="flex justify-between text-xl font-bold pt-2">  
                                    <span>Total</span>  
                                    <span class="gradient-text">$${total.toFixed(2)}</span>  
                                </div>  
                            </div>  
                        </div>  
                          
                        <div class="glass-card rounded-xl p-6 mb-6">  
                            <label class="block text-sm font-medium mb-2">Promo Code</label>  
                            <div class="flex space-x-2">  
                                <input type="text" id="promo-input" placeholder="Enter code"   
                                    class="flex-1 bg-dark-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500 uppercase"  
                                    value="${state.promoCode}">  
                                <button onclick="applyPromo()" class="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition">Apply</button>  
                            </div>  
                            <p id="promo-success" class="text-green-400 text-sm mt-2 ${state.promoApplied ? '' : 'hidden'}">Promo code applied successfully!</p>  
                            <p id="promo-error" class="text-red-400 text-sm mt-2 hidden">Invalid promo code</p>  
                        </div>  
                          
                        <div class="glass-card rounded-xl p-6">  
                            <h3 class="font-semibold mb-4">Payment Details</h3>  
                            <form onsubmit="processPayment(event)" class="space-y-4">  
                                <div>  
                                    <label class="block text-sm font-medium mb-2 text-gray-400">Email</label>  
                                    <input type="email" required class="w-full bg-dark-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-500" placeholder="you@example.com">  
                                </div>  
                                <div>  
                                    <label class="block text-sm font-medium mb-2 text-gray-400">Card Information</label>  
                                    <div class="bg-dark-800 border border-white/10 rounded-lg p-4">  
                                        <div class="flex items-center space-x-2 text-gray-500 mb-2">  
                                            <i data-lucide="credit-card" class="w-5 h-5"></i>  
                                            <span class="text-sm">Credit or debit card</span>  
                                        </div>  
                                        <input type="text" placeholder="Card number" class="w-full bg-transparent text-white placeholder-gray-600 focus:outline-none mb-2" maxlength="19">  
                                        <div class="flex space-x-4">  
                                            <input type="text" placeholder="MM / YY" class="w-1/2 bg-transparent text-white placeholder-gray-600 focus:outline-none" maxlength="5">  
                                            <input type="text" placeholder="CVC" class="w-1/2 bg-transparent text-white placeholder-gray-600 focus:outline-none" maxlength="4">  
                                        </div>  
                                    </div>  
                                </div>  
                                <button type="submit" id="pay-button" class="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-full font-semibold transition mt-6 flex items-center justify-center">  
                                    <span>Pay $${total.toFixed(2)}</span>  
                                    <i data-lucide="arrow-right" class="w-5 h-5 ml-2"></i>  
                                </button>  
                            </form>  
                            <p class="text-xs text-gray-500 text-center mt-4 flex items-center justify-center">  
                                <i data-lucide="lock" class="w-3 h-3 mr-1"></i>  
                                Secure payment processing by Stripe  
                            </p>  
                        </div>  
                    </div>  
                `;  
            },  
            success(params) {  
                // Process the purchase  
                if (state.checkoutData) {  
                    if (state.checkoutData.type === 'bundle') {  
                        state.checkoutData.items.forEach(id => {  
                            if (!state.purchases.includes(id)) state.purchases.push(id);  
                        });  
                    } else {  
                        if (!state.purchases.includes(state.checkoutData.courseId)) {  
                            state.purchases.push(state.checkoutData.courseId);  
                        }  
                    }  
                    state.checkoutData = null;  
                }  
                  
                return `  
                    <div class="min-h-screen flex items-center justify-center px-4 animate-fade-in">  
                        <div class="text-center max-w-md">  
                            <div class="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">  
                                <i data-lucide="check" class="w-10 h-10 text-green-500"></i>  
                            </div>  
                            <h1 class="text-3xl font-bold mb-4">Payment Successful!</h1>  
                            <p class="text-gray-400 mb-8">Your course has been unlocked. Check your email for access details.</p>  
                            <div class="space-y-3">  
                                <button onclick="router.navigate('dashboard')" class="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-full font-semibold transition">  
                                    Go to Dashboard  
                                </button>  
                                <button onclick="router.navigate('courses')" class="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-full font-semibold transition">  
                                    Browse More Courses  
                                </button>  
                            </div>  
                        </div>  
                    </div>  
                `;  
            },  
            dashboard() {  
                const myCourses = state.courses.filter(c => state.purchases.includes(c.id));  
                  
                let coursesHtml = '';  
                if (myCourses.length === 0) {  
                    coursesHtml = `  
                        <div class="glass-card rounded-2xl p-12 text-center">  
                            <div class="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">  
                                <i data-lucide="book-open" class="w-8 h-8 text-gray-400"></i>  
                            </div>  
                            <h3 class="text-xl font-semibold mb-2">No courses yet</h3>  
                            <p class="text-gray-400 mb-6">Start your trading journey with our beginner course.</p>  
                            <button onclick="router.navigate('courses')" class="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-full font-semibold transition">  
                                Explore Courses  
                            </button>  
                        </div>  
                    `;  
                } else {  
                    coursesHtml = '<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">';  
                    myCourses.forEach(course => {  
                        const headerDisplay = course.type === 'beginner'  
                            ? `<div class="h-32 bg-gradient-to-br from-brand-900/50 to-dark-800 flex items-center justify-center"><i data-lucide="book-open" class="w-12 h-12 text-brand-400"></i></div>`  
                            : `<div class="h-32 pair-badge flex items-center justify-center"><span class="text-2xl font-bold text-brand-400">${course.pair}</span></div>`;  
                          
                        coursesHtml += `  
                            <div class="glass-card rounded-xl overflow-hidden hover:border-brand-500/50 transition cursor-pointer" onclick="router.navigate('learn', {courseId: '${course.id}'})">  
                                ${headerDisplay}  
                                <div class="p-6">  
                                    <div class="flex items-center justify-between mb-3">  
                                        <span class="text-xs text-brand-400 font-semibold">${course.level}</span>  
                                        <span class="text-xs text-gray-500">${course.duration}</span>  
                                    </div>  
                                    <h3 class="font-semibold text-lg mb-2">${course.title}</h3>  
                                    <div class="mt-4 flex items-center justify-between">  
                                        <div class="flex-1 bg-dark-800 rounded-full h-2 mr-4">  
                                            <div class="bg-brand-500 h-2 rounded-full" style="width: ${Math.random() * 40 + 10}%"></div>  
                                        </div>  
                                        <span class="text-sm text-gray-400">Continue</span>  
                                    </div>  
                                </div>  
                            </div>  
                        `;  
                    });  
                    coursesHtml += '</div>';  
                }  
                  
                return `  
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">  
                        <div class="flex items-center justify-between mb-8">  
                            <div>  
                                <h1 class="text-3xl font-bold">My Dashboard</h1>  
                                <p class="text-gray-400 mt-1">Welcome back, ${state.currentUser?.email || 'Trader'}</p>  
                            </div>  
                            <button onclick="router.navigate('courses')" class="bg-white/5 hover:bg-white/10 border border-white/20 px-6 py-2 rounded-full transition">  
                                Browse Courses  
                            </button>  
                        </div>  
                        ${coursesHtml}  
                    </div>  
                `;  
            },  
            learn(courseId) {  
                const course = state.courses.find(c => c.id === courseId);  
                if (!course || !state.purchases.includes(courseId)) {  
                    return '<div class="p-20 text-center">Access denied</div>';  
                }  
                  
                let modulesHtml = '';  
                course.modules.forEach((module, idx) => {  
                    modulesHtml += `  
                        <div class="flex items-center p-3 rounded-lg ${idx === 0 ? 'bg-brand-500/20 border border-brand-500/30' : 'hover:bg-white/5'} cursor-pointer transition">  
                            <div class="w-8 h-8 rounded-full ${idx === 0 ? 'bg-brand-500' : 'bg-white/10'} flex items-center justify-center mr-3 text-sm">  
                                ${idx === 0 ? '<i data-lucide="play" class="w-4 h-4"></i>' : idx + 1}  
                            </div>  
                            <div class="flex-1">  
                                <p class="font-medium text-sm ${idx === 0 ? 'text-white' : 'text-gray-400'}">${module.title}</p>  
                                <p class="text-xs text-gray-500">${module.duration}</p>  
                            </div>  
                            ${idx === 0 ? '<i data-lucide="check-circle" class="w-4 h-4 text-brand-400"></i>' : ''}  
                        </div>  
                    `;  
                });  
                  
                const videoHeader = course.type === 'beginner'  
                    ? `<div class="aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-brand-900/50 to-dark-800 mb-6 relative flex items-center justify-center"><div class="text-center"><div class="w-20 h-20 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-4"><i data-lucide="book-open" class="w-10 h-10 text-brand-400"></i></div><span class="text-2xl font-bold text-brand-400">Beginner Course</span></div></div>`  
                    : `<div class="aspect-video rounded-2xl overflow-hidden pair-badge mb-6 relative flex items-center justify-center"><span class="text-6xl font-bold text-brand-400">${course.pair}</span></div>`;  
                  
                return `  
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">  
                        <button onclick="router.navigate('dashboard')" class="mb-6 text-gray-400 hover:text-white flex items-center transition">  
                            <i data-lucide="arrow-left" class="w-4 h-4 mr-2"></i> Back to Dashboard  
                        </button>  
                          
                        <div class="grid lg:grid-cols-3 gap-8">  
                            <div class="lg:col-span-2">  
                                ${videoHeader}  
                                  
                                <div class="glass-card rounded-xl p-6 mb-6">  
                                    <h2 class="text-2xl font-bold mb-2">${course.modules[0].title}</h2>  
                                    <p class="text-gray-400">Module 1 of ${course.modules.length}</p>  
                                </div>  
                                  
                                <div class="glass-card rounded-xl p-6">  
                                    <h3 class="text-xl font-semibold mb-4">About this lesson</h3>  
                                    <p class="text-gray-400 leading-relaxed">  
                                        This lesson covers the core concepts of ${course.title}. Make sure to take notes and complete the practice exercises.   
                                        All materials are downloadable for offline study.  
                                    </p>  
                                </div>  
                            </div>  
                              
                            <div class="lg:col-span-1">  
                                <div class="glass-card rounded-xl p-6 sticky top-24">  
                                    <h3 class="font-semibold mb-4">Course Content</h3>  
                                    <div class="space-y-2">  
                                        ${modulesHtml}  
                                    </div>  
                                </div>  
                            </div>  
                        </div>  
                    </div>  
                `;  
            }  
        }  
    };  
  
    function toggleAuth() {  
        if (state.currentUser) {  
            state.currentUser = null;  
            state.purchases = [];  
            updateAuthUI();  
            router.navigate('home');  
        } else {  
            const email = prompt('Enter email to sign in:');  
            if (email) {  
                state.currentUser = { email };  
                updateAuthUI();  
                router.navigate('dashboard');  
            }  
        }  
    }  
  
    function updateAuthUI() {  
        const btn = document.getElementById('auth-btn');  
        const navDashboard = document.getElementById('nav-dashboard');  
          
        if (state.currentUser) {  
            btn.textContent = 'Sign Out';  
            navDashboard.classList.remove('hidden');  
        } else {  
            btn.textContent = 'Sign In';  
            navDashboard.classList.add('hidden');  
        }  
    }  
  
    function initiateCheckout(type, id) {  
        if (!state.currentUser) {  
            const email = prompt('Enter your email to create account:');  
            if (!email) return;  
            state.currentUser = { email };  
            localStorage.setItem('seeylo_user', JSON.stringify(state.currentUser));  
            updateAuthUI();  
        }  
          
        router.navigate('checkout', { type, courseId: type === 'single' ? id : null, pair: type === 'bundle' ? id : null });  
    }  
  
    function applyPromo() {  
        const input = document.getElementById('promo-input');  
        const error = document.getElementById('promo-error');  
        const success = document.getElementById('promo-success');  
          
        if (input.value.toLowerCase() === 'ixeley15') {  
            state.promoCode = input.value;  
            state.promoApplied = true;  
            error.classList.add('hidden');  
            success.classList.remove('hidden');  
            // Re-render to update price  
            router.navigate('checkout', state.checkoutData);  
        } else {  
            error.classList.remove('hidden');  
            success.classList.add('hidden');  
            state.promoApplied = false;  
        }  
    }  
  
    function processPayment(e) {  
        e.preventDefault();  
          
        const btn = document.getElementById('pay-button');  
        btn.innerHTML = '<span class="animate-spin mr-2">⟳</span> Processing...';  
        btn.disabled = true;  
          
        // Simulate payment processing  
        setTimeout(() => {  
            router.navigate('success');  
        }, 2000);  
    }  
  
    document.addEventListener('DOMContentLoaded', () => {  
        // Check for stored user  
        const storedUser = localStorage.getItem('seeylo_user');  
        if (storedUser) {  
            state.currentUser = JSON.parse(storedUser);  
            updateAuthUI();  
        }  
          
        router.navigate('home');  
        lucide.createIcons();  
    });  
  
    window.addEventListener('popstate', () => {  
        const path = window.location.pathname.replace('/', '') || 'home';  
        router.render(path, {});  
    });  
</script>  
